export declare const SDK_VERSION = "1.0.0";
export declare const PROTOCOL_VERSION = 1;
export declare const MAX_SAVE_BYTES = 1048576;
export declare const CAPABILITY_NAMES: readonly ["lifecycle", "device", "player", "cloudSave", "config", "analytics", "interstitial", "rewarded", "banner", "payments", "leaderboards", "achievements", "tasks", "dailyRewards", "social", "notifications", "crossPromo", "clipboard"];
export type CapabilityName = typeof CAPABILITY_NAMES[number];
export type Environment = 'local' | 'preview' | 'production';
export type Capability = {
    state: 'available' | 'mock' | 'disabled' | 'unsupported';
    reason?: string;
};
export type Capabilities = Record<CapabilityName, Capability>;
export type PlayerProfile = {
    id: string;
    nickname: string;
    avatarUrl: string;
} | null;
export type DeviceInfo = {
    touch: boolean;
    primaryPointer: 'fine' | 'coarse' | 'none';
    reducedMotion: boolean;
    orientation: 'portrait' | 'landscape';
};
export type RuntimeContext = {
    protocolVersion: 1;
    sdkVersion: string;
    gameId: string;
    releaseId: string | null;
    environment: Environment;
    capabilities: Capabilities;
    player: PlayerProfile;
    language: string;
    serverTime: number | null;
    paused: boolean;
    audioEnabled: boolean;
    device: DeviceInfo;
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
};
export type SaveRecord = {
    slot: number;
    payload: Record<string, unknown>;
    schemaVersion: number;
    revision: number;
    updatedAt: string;
    sync: 'local' | 'synced' | 'pending';
};
export type AdOutcome = {
    status: 'completed' | 'cancelled' | 'unfilled' | 'unavailable' | 'failed';
    mock: boolean;
    rewardId?: string;
};
export type PurchaseOrder = {
    id: string;
    productId: string;
    status: 'pending' | 'fulfilled' | 'cancelled' | 'failed';
    mock: boolean;
};
export type Product = {
    id: string;
    title: string;
    price: string;
    currency: string;
    consumable: boolean;
};
export declare class ToTopError extends Error {
    code: string;
    retryable: boolean;
    details?: unknown | undefined;
    constructor(code: string, message?: string, retryable?: boolean, details?: unknown | undefined);
}
export declare const METHODS: readonly ["lifecycle.event", "player.login", "storage.load", "storage.save", "storage.list", "storage.restore", "storage.flush", "config.get", "analytics.track", "ads.interstitial", "ads.rewarded", "ads.banner", "ads.hideBanner", "payments.catalog", "payments.purchase", "payments.restore", "payments.consume", "leaderboards.submit", "leaderboards.entries", "achievements.list", "achievements.unlock", "tasks.list", "tasks.progress", "tasks.claim", "dailyRewards.get", "dailyRewards.claim", "social.share", "social.invite", "social.favorite", "social.rate", "notifications.schedule", "notifications.cancel", "crossPromo.list", "crossPromo.open", "clipboard.write"];
export type Method = typeof METHODS[number];
export type Request = {
    type: 'request';
    protocolVersion: 1;
    id: string;
    nonce: string;
    method: Method;
    args: Record<string, unknown>;
};
export type Transport = {
    connect(options: {
        gameId?: string;
        hostOrigins?: string[];
    }): Promise<RuntimeContext>;
    request<T>(method: Method, args?: Record<string, unknown>): Promise<T>;
    subscribe(listener: (name: string, data: unknown) => void): () => void;
    close(): void;
};
export declare function record(value: unknown): value is Record<string, unknown>;
export declare function saveSlot(value: unknown): number;
export declare function savePayload(value: unknown): Record<string, unknown>;
export declare function capabilities(environment: Environment): Capabilities;
export declare function validContext(value: unknown): value is RuntimeContext;
