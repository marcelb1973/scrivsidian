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
    private readonly scenesHaveTitlePropertySetting: Setting;
    private readonly prefixChapterFoldersWithNumberSetting: Setting;
    private readonly currentInfoEl: HTMLDivElement;
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
            .setName("File")
            .setDesc('Pick the file to import')
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
            .setName('Root binder item')
            .setDesc('Pick the root Scrivener binder item to import.')
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
        this.scenesHaveTitlePropertySetting = new Setting(this.contentEl)
            .setName('Add scene title property')
            .setDesc('When on, each scene note will have a title property set')
            .addToggle(toggle => {
                toggle
                    .setValue(this.current.scenesHaveTitleProperty)
                    .onChange(value => this.current.scenesHaveTitleProperty = value)
            })
        ;
        this.prefixChapterFoldersWithNumberSetting = new Setting(this.contentEl)
            .setName('Prefix chapter folders')
            .setDesc('When on, each chapter folder (binder item containing only scenes) is prefixed by its numerical index in it\'s parent.')
            .addToggle(toggle => {
                toggle
                    .setValue(this.current.prefixChapterFoldersWithNumber)
                    .onChange(value => this.current.prefixChapterFoldersWithNumber = value)
            })
        ;

        this.currentInfoEl = this.contentEl.createDiv({ cls: 'scrivsidian-import-currentinfo' });

        this.inputChanged();
        this.rootChanged();
        this.scenesHaveTitlePropertyChanged();
        this.updateConfigUi();
    }

    public inputChanged(){
        const { rootSetting, current } = this;
        const input = current.inputName;
        if (input === null) {
            current.root = undefined;
        }

        rootSetting.setDisabled(input === null);
    }

    public structureChanged() {
        // void
    }

    public rootChanged(){
        const { scenesHaveTitlePropertySetting, prefixChapterFoldersWithNumberSetting, current } = this;
        const rootBinder = current.root;

        scenesHaveTitlePropertySetting.setDisabled(!rootBinder);
        prefixChapterFoldersWithNumberSetting.setDisabled(!rootBinder);
    }

    public scenesHaveTitlePropertyChanged() {
        // void
    }

    public prefixChapterFoldersWithNumberChanged() {
        // void
    }

    public updateConfigUi() {
        const { currentInfoEl, current } = this;

        currentInfoEl.empty();
        if (!current.inputPath) {
            currentInfoEl.createSpan({ text: 'Pick a Scrivener project to start the import process.' });
            return;
        }
        if (!current.root) {
            const importDescription = new DocumentFragment();
            importDescription.createEl('span', { text: 'You\'ll be importing from ' });
            importDescription.createEl('span', { cls: 'u-pop', text: current.inputName! });
            importDescription.createEl('span', { text: '; however, you need to select which binder folder you want to import.' });
            currentInfoEl.setText(importDescription);
            return;
        }

        const importDescription = new DocumentFragment();

        const selectionParagraph = importDescription.createEl('p');
        selectionParagraph.createEl('span', { text: 'You\'ll be importing ' });
        selectionParagraph.createEl('span', { cls: 'u-pop', text: current.root!.totalSceneCount.toString() });
        selectionParagraph.createEl('span', { text: ' scenes from binder ' });
        selectionParagraph.createEl('span', { cls: 'u-pop', text: current.root!.title });
        selectionParagraph.createEl('span', { text: ' in ' });
        selectionParagraph.createEl('span', { cls: 'u-pop', text: current.inputName! });
        selectionParagraph.createEl('span', { text: '.' });

        const optionsParagraph = importDescription.createEl('p');
        optionsParagraph.createEl('span', { text: 'The title property ' });
        optionsParagraph.createEl('span', { cls: 'u-pop', text: current.scenesHaveTitleProperty ? 'will' : 'won\'t' });
        optionsParagraph.createEl('span', { text: ' be set on the scenes, chapter folders ' });
        optionsParagraph.createEl('span', { cls: 'u-pop', text: current.prefixChapterFoldersWithNumber ? 'will' : 'won\'t' });
        optionsParagraph.createEl('span', { text: ' be prefixed by their index number.' });

        currentInfoEl.setText(importDescription);
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