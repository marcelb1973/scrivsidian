import Scrivsidian from "src/main";
import { Platform } from "obsidian";

export function init(self: Scrivsidian) {
    console.log(`[Scrivsidian] Initializing plugin`);
    if (!Platform.isDesktop) {
        console.log(`[Scrivsidian] Not a desktop platform; this plugin won't work well on non-desktop platforms.`);
        return;
    }
}