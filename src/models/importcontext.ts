import ImportModal from "src/views/import-modal/view";
import { AbstractBinderFolder } from "./binderitem";
import { TFolder } from "obsidian";
import Scrivener from "src/utils/scrivener";

export default class ImportContext{
    // #region properties: common
    protected readonly view: ImportModal;

    public get isRunning(): boolean {
        return false;
    }
    // #endregion properties: common

    // #region properties: project selection
    private readonly scrivener: Scrivener;

    public get inputPath(): string | null{
        return this.scrivener.projectFileFullPath;
    }

    public set inputPath(value: string){
        if (this.scrivener.projectFileFullPath == value) {
            return;
        }

        this.scrivener.load(value);
        this.inputPathChanged();
    }

    public get inputName(): string | null {
        return this.scrivener.projectFileName;
    }

    public get projectName(): string {
        return this.scrivener.projectName;
    }
    // #endregion properties: project selection

    // #region properties: project binder
    private _root: AbstractBinderFolder | null;

    public get root(): AbstractBinderFolder | null {
        return this._root;
    };

    public set root(uuidOrBinderFolder: string | AbstractBinderFolder | undefined) {
        let binderFolder: AbstractBinderFolder | undefined = undefined;
        if (typeof uuidOrBinderFolder === 'string') {
            binderFolder = this.scrivener.findImportableFolder(uuidOrBinderFolder);
        }
        else if (uuidOrBinderFolder instanceof AbstractBinderFolder) {
            binderFolder = uuidOrBinderFolder;
        }

        if (!this._root && !binderFolder) {
            // both empty/not set
            return;
        }

        if (this._root === binderFolder) {
            // both the same
            return;
        }

        if (!binderFolder) {
            this._root = null;
        }
        else {
            this._root = binderFolder;
        }
        this.rootChanged();
    }
    // #endregion properties: project binder

    // #region properties: scenesHaveTitleProperty
    private _scenesHaveTitleProperty: boolean = false;
    public get scenesHaveTitleProperty(): boolean {
        return this._scenesHaveTitleProperty;
    }
    public set scenesHaveTitleProperty(value: boolean) {
        if (value == this._scenesHaveTitleProperty) {
            return;
        }
        this._scenesHaveTitleProperty = value;
        this.scenesHaveTitlePropertyChanged();
    }
    // #endregion properties: scenesHaveTitleProperty

    // #region properties: prefixChapterFoldersWithNumber
    private _prefixChapterFoldersWithNumber: boolean = false;
    public get prefixChapterFoldersWithNumber(): boolean {
        return this._prefixChapterFoldersWithNumber;
    }
    public set prefixChapterFoldersWithNumber(value: boolean) {
        if (value == this._prefixChapterFoldersWithNumber) {
            return;
        }

        this._prefixChapterFoldersWithNumber = value;
        this.prefixChapterFoldersWithNumberChanged();
    }
    // #endregion properties: prefixChapterFoldersWithNumber

    // #region properties: outputLocation
    private _outputLocation: TFolder | undefined = undefined;
    public get outputLocation(): TFolder | undefined {
        return this._outputLocation;
    }

    public set outputLocation(value: TFolder | undefined) {
        const currentPath = this._outputLocation?.path || '';
        const newPath = value?.path || '';

        if (currentPath == newPath) {
            return;
        }

        this._outputLocation = value;
        this.outputLocationChanged();
    }

    public get fullOutputPath(): string {
        const basePath = this.outputLocation?.path || '';
        const suffix = this._createSubFolderForProject ? this.projectName : '';
        return basePath + (basePath.endsWith('/') ? '' : '/') + suffix;
    }
    // #endregion properties: outputLocation

    // #region properties: createSubFolderForProject
    private _createSubFolderForProject: boolean = false;
    public get createSubFolderForProject(): boolean {
        return this._createSubFolderForProject;
    }
    public set createSubFolderForProject(value: boolean) {
        if (value == this._createSubFolderForProject) {
            return;
        }

        this._createSubFolderForProject = value;
        this.createSubFolderForProjectChanged();
    }
    // #endregion properties: createSubFolderForProject

    public constructor(view: ImportModal){
        this.view = view;
        this.scrivener = new Scrivener(this.view.plugin);
    }

    // #region properties changed
    protected inputPathChanged(){
        // notify UI of both input and structure changes
        this.view.inputChanged();
        this.view.structureChanged();
        // set to root of project (ie. import everything)
        this._root = this.scrivener.binder;
        // notify UI the root has changed
        this.view.rootChanged();
        // update the configuration UI
        this.view.updateConfigUi();
    }

    protected rootChanged() {
        // notify UI
        this.view.rootChanged();
        this.view.updateConfigUi();
    }

    protected scenesHaveTitlePropertyChanged() {
        // notify UI
        this.view.scenesHaveTitlePropertyChanged();
        this.view.updateConfigUi();
    }

    protected prefixChapterFoldersWithNumberChanged() {
        // notify UI
        this.view.prefixChapterFoldersWithNumberChanged();
        this.view.updateConfigUi();
    }

    protected outputLocationChanged() {
        // notify UI
        this.view.outputLocationChanged();
        this.view.updateConfigUi();
    }

    protected createSubFolderForProjectChanged() {
        // notify UI
        this.view.createSubFolderForProjectChanged();
        this.view.updateConfigUi();
    }
    // #endregion properties changed

    public * getImportableFolders() {
        yield* this.scrivener.importableFolders();
    }

    public cancel() {
    }
}