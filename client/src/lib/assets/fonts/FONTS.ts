import Weiholmir from '$lib/assets/fonts/Weiholmir_regular.ttf';

export const FONTS = {
	Weiholmir
};

export function loadFonts() {
	return Promise.all(Object.values(FONTS).map((font) => document.fonts.load(`12px '${font}'`)));
}
