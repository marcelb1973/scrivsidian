import { Modal, Setting, TFolder } from "obsidian";
import Scrivsidian from "src/main";
import { BinderFolder } from "src/models/binderitem";
import ImportContext from "src/models/importcontext";
import SelectScrivenerBinderItem from "../common-modal/select-scriv-binderitem";
import FolderSuggest from "src/utils/foldersuggest";
import { HTMLElementProgressReporting } from "src/utils/progressreporting";

export default class ImportModal extends Modal {
    private readonly parent: TFolder;
    private abortController: AbortController;
    private readonly current: ImportContext;
    private readonly inputSetting: Setting;
    private readonly rootSetting: Setting;
    private readonly outputLocationSetting: Setting;
    private readonly createSubFolderForProjectSetting: Setting;
    private readonly currentInfoEl: HTMLDivElement;
    private readonly importButton: HTMLButtonElement;
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
        this.modalEl.addClass('scrivsidian-import-modal');

        new Setting(this.contentEl)
            .setName('Input')
            .setHeading();

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
                            .select(this.plugin, this.current.getImportableFolders());
                        if (!selectedFolder) {
                            // root folder selection was canceled
                            return;
                        }

                        this.current.root = selectedFolder as BinderFolder;
                    })
                ;
            })
        ;

        new Setting(this.contentEl)
            .setName('Output')
            .setHeading();

        this.outputLocationSetting = new Setting(this.contentEl)
            .setName('Location')
            .setDesc('Pick the vault location to import into.')
            .addText(txt => {
                txt
                    .setValue(this.parent.isRoot() ? '/' : this.parent.path)
                    .onChange(value => this.setOutputLocation(value))
                ;
                new FolderSuggest(this.app, txt.inputEl, this.parent);
            })
        ;
        new Setting(this.contentEl)
            .setName('Options')
            .setHeading();
        this.createSubFolderForProjectSetting = new Setting(this.contentEl)
            .setName('New sub folder')
            .setDesc('When on, a new sub folder is created to import the project into')
            .addToggle(toggle => {
                toggle
                    .setValue(this.current.createSubFolderForProject)
                    .onChange(value => this.current.createSubFolderForProject = value)
            })
        ;

        new Setting(this.contentEl)
            .setName('Include Scrivener UUID in frontmatter')
            .setDesc('When on, the Scrivener binder item UUID is included into the frontmatter')
            .addToggle(toggle => {
                toggle
                    .setValue(this.current.includeScrivenerUUIDProperty)
                    .onChange(value => this.current.includeScrivenerUUIDProperty = value)
            })
        ;

        new Setting(this.contentEl)
            .setName('Configured import process')
            .setHeading();

        this.currentInfoEl = this.contentEl.createDiv({ cls: 'scrivsidian-import-currentinfo' });

        const buttonContainerEl = this.contentEl.createDiv('modal-button-container');
        this.importButton = buttonContainerEl.createEl('button', { cls: 'mod-cta', text: 'Import' });
        this.importButton.addEventListener('click', async () => await this.startImport())

        this.inputChanged();
        this.rootChanged();
        this.current.outputLocation = this.parent;
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
        const { current } = this;
        const rootBinder = current.root;

        this.importButton.disabled = !rootBinder;
    }

    public createSubFolderForProjectChanged() {
        // void
    }

    public includeScrivenerUUIDPropertyChanged() {
        // void
    }

    protected setOutputLocation(value: string) {
        const folder = value == '' ? undefined : (this.app.vault.getFolderByPath(value) || undefined);
        this.current.outputLocation = folder;
    }

    public outputLocationChanged() {
        // void
    }

    protected getConfigDescription(): DocumentFragment {
        const { current } = this;

        const fragment = new DocumentFragment();

        if (!current.inputPath) {
            fragment.appendText('Pick a Scrivener project to start the import process.');
            return fragment;
        }

        const selectionParagraph = fragment.createEl('p');
        selectionParagraph.createEl('span', { text: 'You\'ll be importing ' });
        selectionParagraph.createEl('span', { cls: 'u-pop', text: current.root ? current.root.totalSceneCount.toString() : '?' });
        selectionParagraph.createEl('span', { text: ' scenes from binder ' });
        selectionParagraph.createEl('span', { cls: 'u-pop', text: current.root ? current.root.title : '?' });
        selectionParagraph.createEl('span', { text: ' in ' });
        selectionParagraph.createEl('span', { cls: 'u-pop', text: current.inputName! });
        selectionParagraph.createEl('span', { text: '.' });

        const outputParagraph = fragment.createEl('p');
        outputParagraph.createEl('span', { text: 'The project will be imported into ' });
        outputParagraph.createEl('span', { cls: 'u-pop', text: current.fullOutputPath });
        outputParagraph.createEl('span', { text: '.' });

        const includeScrivUUIDParagraph = fragment.createEl('p');
        includeScrivUUIDParagraph.createEl('span', { text: 'Scrivener UUID ' });
        includeScrivUUIDParagraph.createEl('span', { cls: 'u-pop', text: current.includeScrivenerUUIDProperty ? 'added' : 'not added' });
        includeScrivUUIDParagraph.createEl('span', { text: ' to frontmatter.' });

        return fragment;
    }

    public updateConfigUi() {
        this.currentInfoEl.setText(this.getConfigDescription());
    }

	onClose() {
		const { contentEl, current } = this;
		contentEl.empty();
		this.abortController.abort('import was canceled by user');

		if (current.isRunning) {
			current.cancel();
		}
	}

    protected async startImport(): Promise<void> {
        const { contentEl, current } = this;
        
        contentEl.empty();

        const currentInfoEl = contentEl.createDiv({ cls: 'scrivsidian-import-currentinfo' });
        currentInfoEl.setText(this.getConfigDescription());

        const statusEl = contentEl.createDiv({cls: 'scrivsidian-import-status'});

        const progressOuter = contentEl.createDiv({cls: 'scrivsidian-import-progressbar'});
        const progressInner = progressOuter.createDiv({cls: 'scrivsidian-import-progressbar-inner'});

        const logOuter = contentEl.createDiv({cls: 'scrivsidian-import-log-container'});
        logOuter.createDiv({cls: 'scrivsidian-import-log-header', text: 'Log'});
        const logInner = logOuter.createDiv({cls: 'scrivsidian-import-log'});
        logOuter.hide();

        const progressReporting = new HTMLElementProgressReporting(
            current.root!.totalBinderItemCount, statusEl, logOuter, logInner, progressInner
        );

        let buttonsEl = contentEl.createDiv('modal-button-container');
        let cancelButtonEl = buttonsEl.createEl('button', { cls: 'mod-danger', text: 'Stop' }, el => {
            el.addEventListener('click', () => {
                current.cancel();
                cancelButtonEl.detach();
            });
        });
        try {
            await current.import(progressReporting);
        }
        finally {
            buttonsEl.empty();
            buttonsEl.createEl('button', { cls: 'mod-cta', text: 'Done' }, el => {
                el.addEventListener('click', () => this.close());
            });
            progressReporting.hideStatus();
        }
    }
}