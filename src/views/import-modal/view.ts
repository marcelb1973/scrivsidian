import { Modal, Setting, TFolder } from "obsidian";
import Scrivsidian from "src/main";
import { BinderFolder } from "src/models/binderitem";
import ImportContext from "src/models/importcontext";
import SelectScrivenerBinderItem from "../common-modal/select-scriv-binderitem";

export default class ImportModal extends Modal {
    private parent: TFolder;
    private abortController: AbortController;
    private readonly current: ImportContext;
    private readonly inputSetting: Setting;
    private readonly rootSetting: Setting;
    public readonly plugin: Scrivsidian;

    constructor(plugin: Scrivsidian, parent: TFolder){
        super(plugin.app);
        this.plugin = plugin;
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
                    .setIcon('files')
                    .onClick(async () => {
						let properties = ['openFile', 'dontAddToRecent'];
						let filePaths: string[] = window.electron.remote.dialog.showOpenDialogSync({
							title: 'Pick the file to import', properties,
							filters: [{ name, extensions }],
						});

                        if (!filePaths) {
                            // file selection was canceled
                            return;
                        }

                        if (filePaths.length > 0) {
                            this.current.inputPath = filePaths[0];
                        }
                    })
            });
        this.rootSetting = new Setting(this.contentEl)
            .setName('Select root binder item')
            .addButton(btn => {
                btn
                    .setIcon('lucide-folder-tree')
                    .onClick(async () => {
                        const selectedFolder = await SelectScrivenerBinderItem
                            .select(this.plugin, this.current.importableFolders);
                        if (!selectedFolder) {
                            // root folder selection was canceled
                            return;
                        }

                        this.current.root = selectedFolder as BinderFolder;
                    })
                ;
            })
        ;

        this.inputChanged();
        this.rootChanged();
    }

    public inputChanged(){
        const { inputSetting, rootSetting, current } = this;
        const input = current.inputName;
        if (input === null) {
            inputSetting.setDesc('Pick the file to import');
            rootSetting.setDisabled(true);
            return;
        }

        const description = new DocumentFragment();
        description.createEl('span', { text: 'Selected Scrivener project:' });
        description.createEl('br');
        description.createEl('span', { cls: 'u-pop', text: input });

        inputSetting.setDesc(description);
        rootSetting.setDisabled(false);
    }

    public structureChanged() {
        // void
    }

    public rootChanged(){
        const { rootSetting, current } = this;
        const rootBinder = current.root;

        if (!rootBinder) {
            rootSetting.setDesc('Pick the root Scrivener folder to import.');
            return;
        }

        const fragment = new DocumentFragment();
        fragment.createSpan({ text: 'Importing ' });
        fragment.createSpan({ text: rootBinder.totalSceneCount.toString(), cls: 'u-pop' });
        fragment.createSpan({ text: ' scenes from folder ' })
        fragment.createSpan({ text: rootBinder.title, cls: 'u-pop' });
        rootSetting.setDesc(fragment);
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