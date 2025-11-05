import { AbstractInputSuggest, App, TFolder } from "obsidian";

export default class FolderSuggest extends AbstractInputSuggest<string> {
    private folders: string[];
    private readonly rootPath: string;
    private readonly inputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement, rootFolder: TFolder | undefined) {
        super(app, inputEl);
        this.inputEl = inputEl;
        this.rootPath = rootFolder?.path || '';
        this.folders = this.app.vault.getAllFolders(true)
            .filter(folder => this.rootPath == '/' || folder.path.startsWith(this.rootPath))
            .map(folder => folder.path);
    }

    getSuggestions(inputStr: string): string[] {
        const inputLower = inputStr.toLowerCase();
        return this.folders.filter(folder => 
            folder.toLowerCase().includes(inputLower)
        );
    }

    renderSuggestion(folder: string, el: HTMLElement): void {
        el.createEl("div", { text: folder });
    }

    selectSuggestion(folder: string): void {
        this.setValue(folder);
        this.inputEl.dispatchEvent(new Event('input'));
        this.close();
    }
}