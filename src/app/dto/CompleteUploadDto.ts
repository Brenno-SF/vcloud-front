export interface PartsDto {
    partNumber: number;
    eTag: string;
}
export interface CompleteUploadDto {
    uploadId: string;
    parts: PartsDto[];
}