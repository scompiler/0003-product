export interface File {
    path: string;
    content: Buffer;
    dependencies: string[];
}
