pub mod math;

use math::DbVector2;
use std::time::Duration;

use spacetimedb::{Identity, ReducerContext, Table, Timestamp, ScheduleAt, rand::Rng, reducer, table};

const START_PLAYER_MASS: i32 = 15;

#[table(name = spawn_food_timer, scheduled(spawn_food))]
pub struct SpawnFoodTimer {
    #[primary_key]
    #[auto_inc]
    scheduled_id: u64,
    scheduled_at: ScheduleAt,
}

#[table(name = player, public)]
#[table(name = logged_out_player)]
#[derive( Debug, Clone)]
pub struct Player {
    #[primary_key]
    identity: Identity,
    #[unique]
    #[auto_inc]

    player_id: i32,
    name: Option<String>,
    color: Option<String>,
}

#[table(name = message, public)]
pub struct Message {
    sender: Identity,
    sent: Timestamp,
    text: String,
}


#[reducer]
/// Clients invoke this reducer to set their player names.
pub fn set_name(ctx: &ReducerContext, name: String) -> Result<(), String> {
    let name = validate_name(name)?;
    if let Some(player) = ctx.db.player().identity().find(ctx.sender) {
        ctx.db.player().identity().update(Player { name: Some(name), ..player });
        Ok(())
    } else {
        Err("Cannot set name for unknown player".to_string())
    }
}


#[reducer]
pub fn set_color(ctx: &ReducerContext, color: String) -> Result<(), String> {
    if let Some(player) = ctx.db.player().identity().find(ctx.sender) {
        ctx.db.player().identity().update(Player { color: Some(color), ..player });
        Ok(())
    } else {
        Err("Cannot set color for unknown player".to_string())
    }
}

/// You could extend this in various ways, like:
/// Comparing against a blacklist for moderation purposes.
/// Unicode-normalizing names.
/// Rejecting names that contain non-printable characters, or removing characters or replacing them with a placeholder.
/// Rejecting or truncating long names.
/// Rejecting duplicate names.
fn validate_name(name: String) -> Result<String, String> {
    if name.is_empty() {
        Err("Names must not be empty".to_string())
    } else {
        Ok(name)
    }
}

#[reducer]
pub fn update_player_input(ctx: &ReducerContext, direction: DbVector2) -> Result<(), String> {

    let player = ctx
        .db
        .player()
        .identity()
        .find(&ctx.sender)
        .ok_or("Player not found")?;
    for mut circle in ctx.db.circle().player_id().filter(&player.player_id) {
        circle.direction = direction.normalized();
        circle.speed = direction.magnitude().clamp(0.0, 1.0);
        ctx.db.circle().entity_id().update(circle);
    }
    Ok(())
}

#[table(name = move_all_players_timer, scheduled(move_all_players))]
pub struct MoveAllPlayersTimer {
    #[primary_key]
    #[auto_inc]
    scheduled_id: u64,
    scheduled_at: ScheduleAt,
}

const START_PLAYER_SPEED: i32 = 10;
const MINIMUM_SAFE_MASS_RATIO: f32 = 0.85;

fn mass_to_max_move_speed(mass: i32) -> f32 {
    2.0 * START_PLAYER_SPEED as f32 / (1.0 + (mass as f32 / START_PLAYER_MASS as f32).sqrt())
}

/// Check if two entities are overlapping based on their positions and masses
fn is_overlapping(entity_a: &Entity, entity_b: &Entity) -> bool {
    let radius_a = mass_to_radius(entity_a.mass);
    let radius_b = mass_to_radius(entity_b.mass);
    let max_radius = radius_a.max(radius_b);

    // Calculate distance squared between centers
    let dx = entity_a.position.x - entity_b.position.x;
    let dy = entity_a.position.y - entity_b.position.y;
    let distance_squared = dx * dx + dy * dy;

    // If distance is less than max radius, smaller circle's center is inside larger circle
    distance_squared < max_radius * max_radius
}

#[reducer]
pub fn move_all_players(ctx: &ReducerContext, _timer: MoveAllPlayersTimer) -> Result<(), String> {
    let world_size = ctx
        .db
        .config()
        .id()
        .find(0)
        .ok_or("Config not found")?
        .world_size;

    // Handle player movement
    for circle in ctx.db.circle().iter() {
        let circle_entity = ctx.db.entity().entity_id().find(&circle.entity_id);
        if !circle_entity.is_some() {
            // This can happen if a circle is eaten by another circle
            continue;
        }
        let mut circle_entity = circle_entity.unwrap();
        let circle_radius = mass_to_radius(circle_entity.mass);
        let direction = circle.direction * circle.speed;
        let new_pos =
            circle_entity.position + direction * mass_to_max_move_speed(circle_entity.mass);
        let min = circle_radius;
        let max = world_size as f32 - circle_radius;
        circle_entity.position.x = new_pos.x.clamp(min, max);
        circle_entity.position.y = new_pos.y.clamp(min, max);
        ctx.db.entity().entity_id().update(circle_entity);
    }

    // Check for collisions and handle eating mechanics
    // Collect all entities into a vector to avoid borrow checker issues
    let all_entities: Vec<Entity> = ctx.db.entity().iter().collect();

    for entity_a in &all_entities {
        // Skip if entity_a was already deleted
        if ctx.db.entity().entity_id().find(&entity_a.entity_id).is_none() {
            continue;
        }

        for entity_b in &all_entities {
            // Skip self-collision
            if entity_a.entity_id == entity_b.entity_id {
                continue;
            }

            // Skip if entity_b was already deleted
            if ctx.db.entity().entity_id().find(&entity_b.entity_id).is_none() {
                continue;
            }

            // Check if entities are overlapping
            if !is_overlapping(entity_a, entity_b) {
                continue;
            }

            // Check if entity_b is food
            if let Some(_food) = ctx.db.food().entity_id().find(&entity_b.entity_id) {
                // Entity A eats the food
                let mut updated_entity_a = ctx.db.entity().entity_id().find(&entity_a.entity_id).unwrap();
                updated_entity_a.mass += entity_b.mass;
                ctx.db.entity().entity_id().update(updated_entity_a);

                // Delete the food
                ctx.db.food().entity_id().delete(&entity_b.entity_id);
                ctx.db.entity().entity_id().delete(&entity_b.entity_id);
                continue;
            }

            // Check if both are circles - handle circle vs circle combat
            if let Some(_circle_a) = ctx.db.circle().entity_id().find(&entity_a.entity_id) {
                if let Some(_circle_b) = ctx.db.circle().entity_id().find(&entity_b.entity_id) {
                    // Calculate mass ratio
                    let mass_ratio = entity_b.mass as f32 / entity_a.mass as f32;

                    // Can only eat if other circle is small enough (below safety threshold)
                    if mass_ratio < MINIMUM_SAFE_MASS_RATIO {
                        // Entity A eats entity B
                        let mut updated_entity_a = ctx.db.entity().entity_id().find(&entity_a.entity_id).unwrap();
                        updated_entity_a.mass += entity_b.mass;
                        ctx.db.entity().entity_id().update(updated_entity_a);

                        // Delete the smaller circle
                        ctx.db.circle().entity_id().delete(&entity_b.entity_id);
                        ctx.db.entity().entity_id().delete(&entity_b.entity_id);
                    }
                }
            }
        }
    }

    Ok(())
}

#[reducer]
/// clients invoke this reducer to send a message.
pub fn send_message(ctx: &ReducerContext, text: String) -> Result<(), String> {
    let text = validate_message(text)?;
    log::info!("{}", text);
    ctx.db.message().insert(Message {
        sender: ctx.sender,
        text,
        sent: ctx.timestamp,
    });
    Ok(())
}


/// You could extend the validation in validate_message in similar ways to validate_name, or add additional checks to send_message, like:
/// Rejecting messages from senders who haven't set their names.
/// Rate-limiting players so they can't send new messages too quickly.
fn validate_message(text: String) -> Result<String, String> {
    if  text.is_empty() {
        Err("Messages must not be empty".to_string())
    } else {
        Ok(text)
    }
}


fn is_identity_already_connected(ctx: &ReducerContext) -> bool {
    ctx.db.player().identity().find(ctx.sender).is_some()
}

#[reducer(init)]
pub fn init(ctx: &ReducerContext) -> Result<(), String> {
    log::info!("Database initialized at timestamp {:?}", ctx.timestamp);

    ctx.db.config().try_insert(Config {
        id: 0,
        world_size: 1000,
    })?;

    ctx.db
        .move_all_players_timer()
        .try_insert(MoveAllPlayersTimer {
            scheduled_id: 0,
            scheduled_at: ScheduleAt::Interval(Duration::from_millis(50).into()),
        })?;


    ctx.db.spawn_food_timer().try_insert(SpawnFoodTimer {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Interval(Duration::from_millis(500).into()),
    })?;

    Ok(())
}


#[reducer(client_connected)]
// called when a client connects to a spacetimeDB database
pub fn client_connected(ctx: &ReducerContext) -> Result<(), String> {
    
    let already_connected = is_identity_already_connected(ctx);
    if already_connected {
        return Err("ALREADY_CONNECTED".to_string());
    }
    if let Some(player) = ctx.db.logged_out_player().identity().find(&ctx.sender) {
        ctx.db.player().insert(player.clone());
        ctx.db
            .logged_out_player()
            .identity()
            .delete(&player.identity);
    } else {
        ctx.db.player().try_insert(Player {
            identity: ctx.sender,
            player_id: 0,
            name: None,
            color: None,
        })?;
    }

    Ok(())
}


#[reducer(client_disconnected)]
// called when a client disconnects from a spacetimeDB database
pub fn identity_disconnected(ctx: &ReducerContext) -> Result<(), String> {
    let player = ctx
        .db
        .player()
        .identity()
        .find(&ctx.sender)
        .ok_or("Player not found")?;

    let player_id = player.player_id;
    ctx.db.logged_out_player().insert(player);
    ctx.db.player().identity().delete(&ctx.sender);


    for circle in ctx.db.circle().player_id().filter(&player_id) {
        ctx.db.entity().entity_id().delete(&circle.entity_id);
        ctx.db.circle().entity_id().delete(&circle.entity_id);
    }
    Ok(())
}

fn spawn_player_initial_circle(ctx: &ReducerContext, player_id: i32) -> Result<Entity, String> {
    let mut rng = ctx.rng();
    let world_size = ctx
        .db
        .config()
        .id()
        .find(&0)
        .ok_or("Config not found")?
        .world_size;
    let player_start_radius = mass_to_radius(START_PLAYER_MASS);
    let x = rng.gen_range(player_start_radius..(world_size as f32 - player_start_radius));
    let y = rng.gen_range(player_start_radius..(world_size as f32 - player_start_radius));

    spawn_circle_at(
        ctx,
        player_id,
        START_PLAYER_MASS,
        DbVector2 { x, y },
        ctx.timestamp,
    )
}

fn spawn_circle_at(
    ctx: &ReducerContext,
    player_id: i32,
    mass: i32,
    position: DbVector2,
    timestamp: Timestamp,
) -> Result<Entity, String> {
    let entity = ctx.db.entity().try_insert(Entity {
        entity_id: 0,
        position,
        mass,
    })?;

    ctx.db.circle().try_insert(Circle {
        entity_id: entity.entity_id,
        player_id,
        direction: DbVector2 { x: 0.0, y: 1.0 },
        speed: 0.0,
        last_split_time: timestamp,
    })?;
    Ok(entity)
}

#[reducer]
pub fn enter_game(ctx: &ReducerContext,) -> Result<(), String> {

    let player_id = ctx.db.player().identity().find(&ctx.sender)
        .ok_or("Player not found")?
        .player_id;

    spawn_player_initial_circle(ctx, player_id)?;
    Ok(())
}

#[reducer]
pub fn debug(ctx: &ReducerContext) -> Result<(), String> {
    log::debug!("This reducer was called by {}.", ctx.sender);
    Ok(())
}


#[table(name = entity, public)]
#[derive(Debug, Clone)]
pub struct Entity {
    #[auto_inc]
    #[primary_key]
    pub entity_id: i32,
    pub position: DbVector2,
    pub mass: i32,
}

#[table(name = circle, public)]
pub struct Circle {
    #[primary_key]
    pub entity_id: i32,
    #[index(btree)]
    pub player_id: i32,
    pub direction: DbVector2,
    pub speed: f32,
    pub last_split_time: Timestamp,
}

#[table(name = food, public)]
pub struct Food {
    #[primary_key]
    pub entity_id: i32,
}

#[table(name = config, public)]
pub struct Config {
    #[primary_key]
    pub id: i32,
    pub world_size: i64,
}

const FOOD_MASS_MIN: i32 = 2;
const FOOD_MASS_MAX: i32 = 4;
const TARGET_FOOD_COUNT: usize = 600;


fn mass_to_radius(mass: i32) -> f32 {
    (mass as f32).sqrt()
}

#[reducer]
pub fn spawn_food(ctx: &ReducerContext, _timer: SpawnFoodTimer) -> Result<(), String> {
    if ctx.db.player().count() == 0 {
        // Are there no logged in players? Skip food spawn.
        return Ok(());
    }

    let world_size = ctx
        .db
        .config()
        .id()
        .find(0)
        .ok_or("Config not found")?
        .world_size;

    let mut rng = ctx.rng();
    let mut food_count = ctx.db.food().count();
    while food_count < TARGET_FOOD_COUNT as u64 {
        let food_mass = rng.gen_range(FOOD_MASS_MIN..FOOD_MASS_MAX);
        let food_radius = mass_to_radius(food_mass);
        let x = rng.gen_range(food_radius..world_size as f32 - food_radius);
        let y = rng.gen_range(food_radius..world_size as f32 - food_radius);
        let entity = ctx.db.entity().try_insert(Entity {
            entity_id: 0,
            position: DbVector2 { x, y },
            mass: food_mass,
        })?;
        ctx.db.food().try_insert(Food {
            entity_id: entity.entity_id,
        })?;
        food_count += 1;
        log::info!("Spawned food! {}", entity.entity_id);
    }

    Ok(())
}