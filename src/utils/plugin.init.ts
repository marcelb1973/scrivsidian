import Scrivsidian from "src/main";
import { registerContextMenu } from "./plugin.ctxmenu";
import { Platform } from "obsidian";

export function init(self: Scrivsidian) {
    self.logInfo('Initializing plugin');
    if (!Platform.isDesktop) {
        self.logWarning('Not a desktop platform; this plugin won\'t work well on non-desktop platforms.');
        return;
    }
    registerContextMenu(self);
}