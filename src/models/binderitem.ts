/**
 * Represents an abstract Scrivener binder item
 */
export abstract class AbstractBinderItem {
    /**
     * The UUID of the Scrivener binder item
     */
    readonly uuid: string;
    /**
     * The title of the Scrivener binder item
     */
    readonly title: string;
    /**
     * The optional parent Scrivener binder folder
     */
    readonly parent: AbstractBinderFolder | null;
    /**
     * The binder level
     */
    readonly level: number;
    /**
     * The optional date and time the Scrivener binder item was created
     */
    readonly createdOn: Date | undefined;
    /**
     * The optional date and time the Scrivener binder item was last modified
     */
    readonly modifiedOn: Date | undefined;

    /**
     * Returns the number of Scrivener scene binder items, regardless of tree depth
     */
    public abstract get totalSceneCount(): number;    
    /**
     * Returns the number of Scrivener binder items contained in this Scrivener binder item
     */
    public abstract get totalBinderItemCount(): number;

    /**
     * Initializes a new instance of the AbstractBinderItem
     * @param uuid The UUID of the Scrivener binder item
     * @param title The title of the Scrivener binder item
     * @param createdOn The optional date and time the Scrivener binder item was created
     * @param modifiedOn The optional date and time the Scrivener binder item was last modified
     * @param parent The optional parent Scrivener binder folder
     */
    protected constructor(uuid: string, title: string, createdOn?: Date, modifiedOn?: Date, parent?: AbstractBinderFolder) {
        this.uuid = uuid;
        this.title = title;
        this.parent = parent ?? null;
        this.level = (this.parent ? 1 + this.parent.level : 0);
        this.createdOn = createdOn;
        this.modifiedOn = modifiedOn;

        if (this.parent) {
            this.parent.children.push(this);
        }
    }

    /**
     * The title comparer
     */
    protected static readonly comparer = new Intl.Collator('en', { numeric: true }).compare;
}

/**
 * Represents an abstract Scrivener binder folder
 */
export abstract class AbstractBinderFolder extends AbstractBinderItem {
    /**
     * The child Scrivener binder items
     */
    readonly children: AbstractBinderItem[];
    private _totalSceneCount: number | null = null;
    private _totalBinderItemCount: number | null = null;
    private _needIndexPrefixForChildren: boolean | undefined = undefined;

    /**
     * Returns true if this Scrivener binder contains any scenes, regardless of tree depth
     */
    public get hasScenes(): boolean {
        return this.totalSceneCount > 0;
    }

    public override get totalSceneCount(): number {
        if (this._totalSceneCount === null) {
            const directSceneCount = this.children.filter(isBinderScene).length;
            const subFolderTotalSceneCount = this.children.filter(isBinderFolder)
                .reduce((acc, cur) => acc + cur.totalSceneCount, 0);

            this._totalSceneCount = directSceneCount + subFolderTotalSceneCount;
        }

        return this._totalSceneCount;
    }

    public override get totalBinderItemCount(): number {
        if (this._totalBinderItemCount === null) {
            this._totalBinderItemCount = 1
                + this.children.filter(isBinderFolder)
                    .reduce((acc, cur) => acc + cur.totalBinderItemCount, 0)
                + this.children.filter(isBinderScene).length
        }

        return this._totalBinderItemCount;
    }

    /**
     * Returns true if immediate child items need to be prefixed with their index number,
     * to preserve sorting order based on name
     */
    public get needIndexPrefixForChildren(): boolean {
        if (this._needIndexPrefixForChildren === undefined) {
            this._needIndexPrefixForChildren = false;
            if (this.children.length > 1) {
                let left = this.children[0].title;
                for(let index = 1; index < this.children.length; index++) {
                    const right = this.children[index].title;
                    if (AbstractBinderItem.comparer(left, right) >= 0) {
                        this._needIndexPrefixForChildren = true;
                        break;
                    }
                    left = right;
                }
            }
        }

        return this._needIndexPrefixForChildren;
    }

    /**
     * Initializes a new instance of AbstractBinderFolder
     * @param uuid The UUID of the Scrivener binder item
     * @param title The title of the Scrivener binder item
     * @param createdOn The optional date and time the Scrivener binder item was created
     * @param modifiedOn The optional date and time the Scrivener binder item was last modified
     * @param parent The optional parent Scrivener binder folder
     */
    public constructor(uuid: string, title: string, createdOn?: Date, modifiedOn?: Date, parent?: BinderFolder) {
        super(uuid, title, createdOn, modifiedOn, parent);
        this.children=[];
    }
}

/** Represents the Scrivener project as a binder folder */
export class BinderProject extends AbstractBinderFolder {
    /**
     * Initializes a new instance of BinderProject
     * @param title The project name
     */
    public constructor(title: string) {
        super('00000000-0000-0000-0000-000000000000', title);
    }
}

/**
 * Represents a Scrivener binder folder
 */
export class BinderFolder extends AbstractBinderFolder {
    /**
     * Initializes a new instance of BinderFolder
     * @param uuid The UUID of the Scrivener binder item
     * @param title The title of the Scrivener binder item
     * @param parent The optional parent Scrivener binder folder
     * @param createdOn The optional date and time the Scrivener binder item was created
     * @param modifiedOn The optional date and time the Scrivener binder item was last modified
     */
    public constructor(uuid: string, title: string, parent?: AbstractBinderFolder, createdOn?: Date, modifiedOn?: Date) {
        super(uuid, title, createdOn, modifiedOn, parent);
    }
}

/**
 * Represents a Scrivener binder scene
 */
export class BinderScene extends AbstractBinderItem {
    public override get totalSceneCount(): number {
        return 1;
    }
    public override get totalBinderItemCount(): number {
        return 1;
    }

    /**
     * Initializes a new instance of BinderScene
     * @param uuid The UUID of the Scrivener binder item
     * @param title The title of the Scrivener binder item
     * @param parent The parent Scrivener binder folder
     * @param createdOn The optional date and time the Scrivener binder item was created
     * @param modifiedOn The optional date and time the Scrivener binder item was last modified
     */
    public constructor(uuid: string, title: string, parent: BinderFolder, createdOn?: Date, modifiedOn?: Date) {
        super(uuid, title, createdOn, modifiedOn, parent);
    }
}

/**
 * Determines if an AbstractBinderItem is an AbstractBinderFolder
 * @param item Abstract Scrivener binder item
 * @returns true if item represents an AbstractBinderFolder
 */
export const isBinderFolder = (item: AbstractBinderItem): item is AbstractBinderFolder =>
    item instanceof AbstractBinderFolder;
/**
 * Determines if an AbstractBinderItem is a BinderScene
 * @param item Abstract Scrivener binder item
 * @returns true if item represents a BinderScene
 */
export const isBinderScene = (item: AbstractBinderItem): item is BinderScene =>
    item instanceof BinderScene;
