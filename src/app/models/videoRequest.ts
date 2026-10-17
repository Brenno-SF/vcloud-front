export interface VideoRequest {
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  thumb?: thumb;
}
export interface thumb{
  contentType: string;
  sizeBytes: number;
}