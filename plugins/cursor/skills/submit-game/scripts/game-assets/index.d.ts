import { type Transport, type RuntimeContext, type Method, type PlayerProfile, type SaveRecord, type AdOutcome, type Product, type PurchaseOrder } from './protocol.js';
export * from './protocol.js';
export declare function createGameClient(transport?: Transport): {
    version: string;
    init(options?: {
        gameId?: string;
        hostOrigins?: string[];
    }): Promise<RuntimeContext>;
    getContext: () => RuntimeContext;
    invoke<T>(method: Method, args?: Record<string, unknown>): Promise<T>;
    getCapabilities: () => import("./protocol.js").Capabilities;
    device: {
        getInfo: () => {
            viewport: {
                width: number;
                height: number;
                safeArea: {
                    top: number;
                    right: number;
                    bottom: number;
                    left: number;
                };
            };
            touch: boolean;
            primaryPointer: "fine" | "coarse" | "none";
            reducedMotion: boolean;
            orientation: "portrait" | "landscape";
        };
    };
    on: (name: string, listener: (data: unknown) => void) => () => void;
    dispose(): void;
    lifecycle: {
        loadingProgress: (percent: number) => Promise<void>;
        ready(): Promise<void>;
        gameplayStart(): Promise<void>;
        gameplayStop(): Promise<void>;
        level: (name: "started" | "completed" | "failed", levelId: string) => Promise<void>;
    };
    player: {
        get: () => PlayerProfile;
        login: () => Promise<PlayerProfile>;
    };
    storage: {
        load: (slot?: number) => Promise<SaveRecord | null>;
        save: (slot: number, payload: Record<string, unknown>, options: {
            schemaVersion: number;
            baseRevision: number;
        }) => Promise<SaveRecord>;
        list: () => Promise<SaveRecord[]>;
        restore: (slot: number, choice: "cloud" | "guest", baseRevision: number) => Promise<SaveRecord | null>;
        flush: () => Promise<{
            pending: number;
        }>;
    };
    config: {
        get: () => Promise<Record<string, unknown>>;
    };
    analytics: {
        track: (name: string, data?: Record<string, string | number | boolean | null>) => Promise<void>;
    };
    ads: {
        interstitial: (placement: string) => Promise<AdOutcome>;
        rewarded: (placement: string) => Promise<AdOutcome>;
        banner: (placement: string) => Promise<{
            shown: boolean;
            mock: boolean;
        }>;
        hideBanner: () => Promise<void>;
    };
    payments: {
        catalog: () => Promise<Product[]>;
        purchase: (productId: string) => Promise<PurchaseOrder>;
        restore: () => Promise<PurchaseOrder[]>;
        consume: (orderId: string) => Promise<void>;
    };
    leaderboards: {
        submit: (id: string, score: number) => Promise<unknown>;
        entries: (id: string) => Promise<unknown>;
    };
    achievements: {
        list: () => Promise<unknown>;
        unlock: (id: string) => Promise<unknown>;
    };
    tasks: {
        list: () => Promise<unknown>;
        progress: (id: string, amount: number) => Promise<unknown>;
        claim: (id: string) => Promise<unknown>;
    };
    dailyRewards: {
        get: () => Promise<unknown>;
        claim: () => Promise<unknown>;
    };
    social: {
        share: () => Promise<unknown>;
        invite: (roomId: string) => Promise<unknown>;
        favorite: () => Promise<unknown>;
        rate: () => Promise<unknown>;
    };
    notifications: {
        schedule: (id: string) => Promise<unknown>;
        cancel: (id: string) => Promise<unknown>;
    };
    crossPromo: {
        list: () => Promise<unknown>;
        open: (gameId: string) => Promise<unknown>;
    };
    clipboard: {
        write: (text: string) => Promise<unknown>;
    };
};
export type GameClient = ReturnType<typeof createGameClient>;
export declare const ToTopGame: {
    version: string;
    init(options?: {
        gameId?: string;
        hostOrigins?: string[];
    }): Promise<RuntimeContext>;
    getContext: () => RuntimeContext;
    invoke<T>(method: Method, args?: Record<string, unknown>): Promise<T>;
    getCapabilities: () => import("./protocol.js").Capabilities;
    device: {
        getInfo: () => {
            viewport: {
                width: number;
                height: number;
                safeArea: {
                    top: number;
                    right: number;
                    bottom: number;
                    left: number;
                };
            };
            touch: boolean;
            primaryPointer: "fine" | "coarse" | "none";
            reducedMotion: boolean;
            orientation: "portrait" | "landscape";
        };
    };
    on: (name: string, listener: (data: unknown) => void) => () => void;
    dispose(): void;
    lifecycle: {
        loadingProgress: (percent: number) => Promise<void>;
        ready(): Promise<void>;
        gameplayStart(): Promise<void>;
        gameplayStop(): Promise<void>;
        level: (name: "started" | "completed" | "failed", levelId: string) => Promise<void>;
    };
    player: {
        get: () => PlayerProfile;
        login: () => Promise<PlayerProfile>;
    };
    storage: {
        load: (slot?: number) => Promise<SaveRecord | null>;
        save: (slot: number, payload: Record<string, unknown>, options: {
            schemaVersion: number;
            baseRevision: number;
        }) => Promise<SaveRecord>;
        list: () => Promise<SaveRecord[]>;
        restore: (slot: number, choice: "cloud" | "guest", baseRevision: number) => Promise<SaveRecord | null>;
        flush: () => Promise<{
            pending: number;
        }>;
    };
    config: {
        get: () => Promise<Record<string, unknown>>;
    };
    analytics: {
        track: (name: string, data?: Record<string, string | number | boolean | null>) => Promise<void>;
    };
    ads: {
        interstitial: (placement: string) => Promise<AdOutcome>;
        rewarded: (placement: string) => Promise<AdOutcome>;
        banner: (placement: string) => Promise<{
            shown: boolean;
            mock: boolean;
        }>;
        hideBanner: () => Promise<void>;
    };
    payments: {
        catalog: () => Promise<Product[]>;
        purchase: (productId: string) => Promise<PurchaseOrder>;
        restore: () => Promise<PurchaseOrder[]>;
        consume: (orderId: string) => Promise<void>;
    };
    leaderboards: {
        submit: (id: string, score: number) => Promise<unknown>;
        entries: (id: string) => Promise<unknown>;
    };
    achievements: {
        list: () => Promise<unknown>;
        unlock: (id: string) => Promise<unknown>;
    };
    tasks: {
        list: () => Promise<unknown>;
        progress: (id: string, amount: number) => Promise<unknown>;
        claim: (id: string) => Promise<unknown>;
    };
    dailyRewards: {
        get: () => Promise<unknown>;
        claim: () => Promise<unknown>;
    };
    social: {
        share: () => Promise<unknown>;
        invite: (roomId: string) => Promise<unknown>;
        favorite: () => Promise<unknown>;
        rate: () => Promise<unknown>;
    };
    notifications: {
        schedule: (id: string) => Promise<unknown>;
        cancel: (id: string) => Promise<unknown>;
    };
    crossPromo: {
        list: () => Promise<unknown>;
        open: (gameId: string) => Promise<unknown>;
    };
    clipboard: {
        write: (text: string) => Promise<unknown>;
    };
};
