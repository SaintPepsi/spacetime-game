use spacetimedb::{table, reducer, Table, ReducerContext, Identity, Timestamp, SpacetimeType};

#[table(name = user, public)]
pub struct User {
    #[primary_key]
    identity: Identity,
    #[unique]
    #[auto_inc]
    player_id: i32,
    name: Option<String>,
    online: bool,
}

#[table(name = message, public)]
pub struct Message {
    sender: Identity,
    sent: Timestamp,
    text: String,
}


#[reducer]
/// Clients invoke this reducer to set their user names.
pub fn set_name(ctx: &ReducerContext, name: String) -> Result<(), String> {
    let name = validate_name(name)?;
    if let Some(user) = ctx.db.user().identity().find(ctx.sender) {
        ctx.db.user().identity().update(User { name: Some(name), ..user });
        Ok(())
    } else {
        Err("Cannot set name for unknown user".to_string())
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
/// Rate-limiting users so they can't send new messages too quickly.
fn validate_message(text: String) -> Result<String, String> {
    if  text.is_empty() {
        Err("Messages must not be empty".to_string())
    } else {
        Ok(text)
    }
}


fn is_identity_already_connected(ctx: &ReducerContext) -> bool {
    ctx.db.user().identity().find(ctx.sender).iter().any(|f| f.online)
}


#[reducer(client_connected)]
// called when a client connects to a spacetimeDB database
pub fn client_connected(ctx: &ReducerContext) -> Result<(), String> {
    
    let already_connected = is_identity_already_connected(ctx);
    if already_connected {
        return Err("ALREADY_CONNECTED".to_string());
    }
    
    if let Some(user) = ctx.db.user().identity().find(ctx.sender) {
        log::info!("User reconnected: {:?}", ctx.sender);
        ctx.db.user().identity().update(User {online: true, ..user});
    } else {
        log::info!("New user connected: {:?}", ctx.sender);
        ctx.db.user().insert(User {
            name: None,
            identity: ctx.sender,
            online: true,
            player_id: 0, // will be set by auto_inc
        });
    }

    Ok(())
}


#[reducer(client_disconnected)]
// called when a client disconnects from a spacetimeDB database
pub fn identity_disconnected(ctx: &ReducerContext) {
    log::info!("Client disconnecting: {:?}", ctx.sender);
    if let Some(user) = ctx.db.user().identity().find(ctx.sender) {
        ctx.db.user().identity().update(User { online: false, ..user });
    } else {
        log::warn!("Disconnected identity not found in user table: {:?}", ctx.sender);
    }

    let already_connected = is_identity_already_connected(ctx);
    log::info!("Client disconnected: {:?}, still connected: {}", ctx.sender, already_connected);
}


#[reducer]
pub fn debug(ctx: &ReducerContext) -> Result<(), String> {
    log::debug!("This reducer was called by {}.", ctx.sender);
    Ok(())
}


#[derive(SpacetimeType, Clone, Debug)]
pub struct DbVector2 {
    pub x: f32,
    pub y: f32,
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

#[spacetimedb::table(name = circle, public)]
pub struct Circle {
    #[primary_key]
    pub entity_id: i32,
    #[index(btree)]
    pub player_id: i32,
    pub direction: DbVector2,
    pub speed: f32,
    pub last_split_time: Timestamp,
}

#[spacetimedb::table(name = food, public)]
pub struct Food {
    #[primary_key]
    pub entity_id: i32,
}