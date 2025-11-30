import ImportModal from "src/views/import-modal/view";
import { AbstractBinderFolder, AbstractBinderItem } from "./binderitem";
import { TFolder } from "obsidian";
import Scrivener from "src/utils/scrivener";
import IProgressReporting from "src/utils/progressreporting";

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

    public set inputPath(value: string | null) {
        if (value === null) {
            return;
        }
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
    private _root: AbstractBinderFolder | undefined;

    public get root(): AbstractBinderFolder | undefined {
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
            this._root = undefined;
        }
        else {
            this._root = binderFolder;
        }
        this.rootChanged();
    }
    // #endregion properties: project binder

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
        const suffix = this._createSubFolderForProject && this.root != this.scrivener.binder
            ? this.projectName
            : '';
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

    // #region properties: includeScrivenerUUIDProperty
    private _includeScrivenerUUIDProperty: boolean = false;
    public get includeScrivenerUUIDProperty(): boolean {
        return this._includeScrivenerUUIDProperty;
    }
    public set includeScrivenerUUIDProperty(value: boolean) {
        if (this._includeScrivenerUUIDProperty == value) {
            return;
        }
        this._includeScrivenerUUIDProperty = value;
        this.includeScrivenerUUIDPropertyChanged();
    }
    // #endregion properties: includeScrivenerUUIDProperty

    // #region properties: keywordsAsTags
    private _keywordsAsTags: boolean = true;
    public get keywordsAsTags(): boolean {
        return this._keywordsAsTags;
    }
    public set keywordsAsTags(value: boolean) {
        if (this._keywordsAsTags == value) {
            return;
        }

        this._keywordsAsTags = value;
        this.keywordsAsTagsChanged();
    }
    // #endregion properties: keywordsAsTags

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

    protected includeScrivenerUUIDPropertyChanged() {
        // notify UI
        this.view.includeScrivenerUUIDPropertyChanged();
        this.view.updateConfigUi();
    }

    protected keywordsAsTagsChanged() {
        // notify UI
        this.view.keywordsAsTagsChanged();
        this.view.updateConfigUi();
    }
    // #endregion properties changed

    public * getImportableFolders() {
        yield* this.scrivener.importableFolders();
    }

    public cancel() {
        this.scrivener.cancel();
    }

    public async import(progressReporting: IProgressReporting): Promise<void> {
        await this.scrivener.import(progressReporting, this);
    }
}