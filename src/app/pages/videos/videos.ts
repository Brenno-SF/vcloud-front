import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { VideosService } from '../../core/services/videos.service';
import { Video } from '../../models/video';
import { VideoRequest } from '../../models/videoRequest';
import { switchMap, map, firstValueFrom } from 'rxjs';
import { CompleteUploadDto, PartsDto } from '../../dto/CompleteUploadDto';

@Component({
  selector: 'app-videos',
  imports: [CommonModule],
  templateUrl: './videos.html',
  styleUrl: './videos.scss',
})
export class Videos implements OnInit {

  videos: Video[] = [];
  loading = true;

  showUploadModal = false;
  selectedFile: File | null = null;

  uploadId: string = '';

  constructor(private videoService: VideosService) { }

  ngOnInit(): void {
    this.loadVideos();
  }

  loadVideos(): void {
    this.videoService.getMyVideos().subscribe({
      next: response => {
        console.log('Resposta do backend:', response);
        this.videos = response;
        this.loading = false;
        console.log('loading:', this.loading);
      },
      error: error => {
        console.error('Erro ao carregar vídeos:', error);
        this.loading = false;
      }
    });
  }

  formatSize(bytes: number): string {

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  openUploadModal(): void {
    this.showUploadModal = true;
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
    this.selectedFile = null;
  }

  onFileSelected(event: Event): void {

    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    this.selectedFile = input.files[0];
  }

  async uploadVideo(): Promise<void> {

    if (!this.selectedFile) {
      return;
    }

    const file = this.selectedFile;

    const videoRequest: VideoRequest = {
      originalFilename: file.name,
      contentType: file.type,
      sizeBytes: file.size
    };

    let totalSize: number = file.size;
    if (totalSize <= 10 * 1024 * 1024) {

      
      const presignedUrlResponse = await firstValueFrom(this.videoService.uploadSmallVideo(videoRequest));

      console.log(presignedUrlResponse);

      const response = await firstValueFrom(this.videoService.uploadSmallVideoToS3(presignedUrlResponse.uploadUrl, file));

      const complete = await firstValueFrom(this.videoService.completeSmallVideo(presignedUrlResponse.videoId) );

      this.closeUploadModal();
      this.loadVideos();

    } else {
      
      let chunkSize: number = 10 * 1024 * 1024; // 10 MB
      let totalChunks: number = Math.ceil(totalSize / chunkSize);

      try {

        const uploadId = await firstValueFrom(this.videoService.uploadLargeVideo(videoRequest));

        const presignedUrls = await firstValueFrom(this.videoService.generatePresignedUrl(videoRequest, totalChunks, uploadId));

        const parts: PartsDto[] = [];

        for (let i = 0; i < totalChunks; i++) {

          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, totalSize);
          const chunk = file.slice(start, end);

          console.log(`Enviando parte ${i + 1}/${totalChunks}`);

          const response = await firstValueFrom(this.videoService.uploadLargeVideoToS3(presignedUrls[i], chunk));

          const eTag = response.headers.get('ETag');

          if (!eTag) {
            throw new Error(`S3 não retornou ETag para a parte ${i + 1}`);
          }

          console.log(`Parte ${i + 1} enviada. ETag:`,eTag);
          parts.push({ partNumber: i + 1, eTag: eTag });
        }

        const dto: CompleteUploadDto = {
          uploadId: uploadId,
          parts: parts
        };

        const completeResponse = await firstValueFrom(this.videoService.completeLargeVideo(dto));

        this.closeUploadModal();
        this.loadVideos();

      } catch (error) {
        console.error('Erro durante o upload multipart:', error);
      }

    }
  }

  async deleteVideo(video: Video) {
    const confirmation = confirm(`Tem certeza de que deseja excluir o vídeo "${video.originalFilename}"?`);
    if (confirmation) {
      await firstValueFrom(this.videoService.deleteVideo(video.id + '/' + video.originalFilename));
      this.loadVideos();
    }
    this.loadVideos();
  }
  async downloadVideo(video: Video) {
  
    await firstValueFrom(this.videoService.downloadVideo(video.id, video.id));
  }
}
