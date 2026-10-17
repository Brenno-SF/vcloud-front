export interface Video {
  id: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  status: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}