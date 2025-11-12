export abstract class AbstractBinderItem {
    readonly uuid: string;
    readonly title: string;
    readonly parent: AbstractBinderItem | null;
    readonly level: number;

    protected constructor(uuid: string, title: string, parent?: AbstractBinderItem) {
        this.uuid = uuid;
        this.title = title;
        this.parent = parent ?? null;
        this.level = (this.parent !== null ? 1 + this.parent.level : 0);

        if (this.parent instanceof AbstractBinderFolder) {
            this.parent.children.push(this);
        }
    }
}

export abstract class AbstractBinderFolder extends AbstractBinderItem {
    readonly children: AbstractBinderItem[];
    private _totalSceneCount: number | null = null;

    public get hasScenes(): boolean {
        return this.totalSceneCount > 0;
    }

    public get totalSceneCount(): number {
        if (this._totalSceneCount === null) {
            const directSceneCount = this.children.filter(isBinderScene).length;
            const subFolderTotalSceneCount = this.children.filter(isBinderFolder)
                .reduce((acc, cur) => acc + cur.totalSceneCount, 0);

            this._totalSceneCount = directSceneCount + subFolderTotalSceneCount;
        }

        return this._totalSceneCount;
    }

    public constructor(uuid: string, title: string, parent?: BinderFolder) {
        super(uuid, title, parent);
        this.children=[];
    }
}

export class BinderProject extends AbstractBinderFolder {
    public constructor(title: string) {
        super('00000000-0000-0000-0000-000000000000', title);
    }
}

export class BinderFolder extends AbstractBinderFolder {
    public constructor(uuid: string, title: string, parent?: BinderFolder) {
        super(uuid, title, parent);
    }
}

export class BinderScene extends AbstractBinderItem {
    public constructor(uuid: string, title: string, parent: BinderFolder) {
        super(uuid, title, parent);
    }
}

export const isBinderFolder = (item: AbstractBinderItem): item is AbstractBinderFolder =>
    item instanceof AbstractBinderFolder;
export const isBinderScene = (item: AbstractBinderItem): item is BinderScene =>
    item instanceof BinderScene;
