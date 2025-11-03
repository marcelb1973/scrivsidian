import { Modal, Setting, TFolder } from "obsidian";
import Scrivsidian from "src/main";
import ImportContext from "src/models/importcontext";

export default class ImportModal extends Modal {
    private parent: TFolder;
    private abortController: AbortController;
    private readonly current: ImportContext;
    private readonly inputSetting: Setting;

    constructor(plugin: Scrivsidian, parent: TFolder){
        super(plugin.app);
        this.parent = parent;
        this.abortController = new AbortController();
        this.setTitle(plugin.ActionTitle);

        const name = 'Scrivener (.scrivx)';
        const extensions = ['scrivx'];

        this.current = new ImportContext(this);

        this.inputSetting = new Setting(this.contentEl)
            .setName("File to import")
            .addButton(btn => {
                btn
                    .setButtonText("Choose file")
                    .onClick(async () => {
						let properties = ['openFile', 'dontAddToRecent'];
						let filePaths: string[] = window.electron.remote.dialog.showOpenDialogSync({
							title: 'Pick the file to import', properties,
							filters: [{ name, extensions }],
						});

                        if (filePaths.length > 0) {
                            this.current.setInputPath(filePaths[0]);
                        }
                    })
            });
        this.inputChanged();
    }

    public inputChanged(){
        const { inputSetting, current } = this;
        const input = current.getInputPath();
        if (input === null) {
            inputSetting.setDesc('Pick the file to import');
            return;
        }

        inputSetting.setDesc(input);
    }

	onClose() {
		const { contentEl, current } = this;
		contentEl.empty();
		this.abortController.abort('import was canceled by user');

		if (current.isRunning) {
			current.cancel();
		}
	}
}