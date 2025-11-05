import { XMLParser } from "fast-xml-parser";
import type * as NodeFS from "node:fs";
import type * as NodePath from 'node:path';
import ImportModal from "src/views/import-modal/view";
import { AbstractBinderItem, BinderFolder, BinderScene, isBinderFolder } from "./binderitem";

export const fs: typeof NodeFS = window.require('node:original-fs');
export const path: typeof NodePath = window.require('node:path');

export default class ImportContext{
    // #region properties: common
    protected readonly view: ImportModal;

    public get isRunning(): boolean {
        return false;
    }
    // #endregion properties: common

    // #region properties: project selection
    private _inputPath: string | null;

    public get inputPath(): string | null{
        return this._inputPath;
    }

    public set inputPath(value: string){
        if (this._inputPath == value) {
            return;
        }

        this._inputPath = value;
        this.inputPathChanged();
    }

    public get inputName(): string | null {
        if (!this._inputPath) {
            return null;
        }

        return path.basename(this._inputPath);
    }
    // #endregion properties: project selection

    // #region properties: project binder
    private _scrivenerProject: any;
    private _flatBinderArray: AbstractBinderItem[];
    private _root: BinderFolder | null;

    public get root(): BinderFolder | null {
        return this._root;
    };

    public set root(uuidOrBinderFolder: string | BinderFolder | undefined) {
        let binderFolder: BinderFolder | undefined = undefined;
        if (typeof uuidOrBinderFolder === 'string') {
            binderFolder = this.importableFolders.find(sf => sf.uuid == uuidOrBinderFolder);
        }
        else if (uuidOrBinderFolder instanceof BinderFolder) {
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

    public get importableFolders(): BinderFolder[] {
        if (!this._flatBinderArray) {
            return [];
        }

        return this._flatBinderArray.filter(isBinderFolder).filter(f => f.hasScenes);
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

    public constructor(view: ImportModal){
        this.view = view;
        this._inputPath = null;
    }

    // #region properties changed
    protected inputPathChanged(){
        // notify UI
        this.view.inputChanged();
        this.view.updateConfigUi();
        // update Scrivener binder
        this.parseScrivx();
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
    // #endregion properties changed

    // #region scrivx parsing
    private parseScrivx(){
        if (this._inputPath === null) {
            return;
        }

        const xml = new XMLParser({
            allowBooleanAttributes: true,
            ignoreAttributes: false,
            ignoreDeclaration: true,
            attributeNamePrefix: "",
            ignorePiTags: true,
            numberParseOptions: {
                leadingZeros: true,
                hex: true,
                skipLike: /\+[0-9]{10}/
            },
            parseAttributeValue: true,
            parseTagValue: true,
            isArray: (name, jpath, isLeafNode, isAttribute) => {
                return name == 'BinderItem' && !isAttribute;
            }
        });

        const data = fs.readFileSync(this._inputPath, {encoding: 'utf8'});

        const parsedObj = xml.parse(data);

        if(parsedObj) {
            this._scrivenerProject = parsedObj.ScrivenerProject;
        }
        else
        {
            this._scrivenerProject = null;
        }
        this.readStructure();
    }

    private readStructure() {
        this._flatBinderArray = [];
        this._scrivenerProject.Binder.BinderItem.forEach((element: any) => {
            this.addBinderItem(element);
        });
        this.view.structureChanged();
    }

    private addBinderItem(element: any, parent?: BinderFolder) {
        const binderItem: AbstractBinderItem = ImportContext.isFolderElement(element)
            ? new BinderFolder(element.UUID, element.Title, parent)
            : new BinderScene(element.UUID, element.Title, parent!);

        this._flatBinderArray.push(binderItem);
        if (binderItem instanceof BinderFolder && element.Children && element.Children.BinderItem) {
            try {
                element.Children.BinderItem.forEach((childElement: any) => {
                    this.addBinderItem(childElement, binderItem);
                });
            } catch {
                this.view.plugin.logError(`Unable to process children on ${binderItem.title}`);
            }
        }
    }

    private static isFolderElement(element: any) {
        return element.Children || element.Type == 'Folder' || element.Type == 'TrashFolder' || element.Type == 'DraftFolder'
    }
    // #endregion scrivx parsing

    public cancel() {
    }
}