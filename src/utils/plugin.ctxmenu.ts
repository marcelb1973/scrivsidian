import { TFolder } from "obsidian";
import Scrivsidian from "src/main";
import ImportModal from "src/views/import-modal/view";

export function registerContextMenu(self: Scrivsidian) {
    self.registerEvent(
        self.app.workspace.on("file-menu", (menu, file) => {
            if (!(file instanceof TFolder)) {
                return;
            };

            menu.addItem(item =>
                item
                    .setTitle(self.ActionTitle)
                    .setIcon("import")
                    .onClick(() => {
                        new ImportModal(self, file).open();
                    })
            );
        })
    );
}