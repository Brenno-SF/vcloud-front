import { Component, OnInit, signal  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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

  videos = signal<Video[]>([]);
  loading = signal(true);
  page = 0;
  size = 10;
  totalElements = 0;

  showUploadModal = false;
  selectedFile: File | null = null;

  uploadId: string = '';

  constructor(private videoService: VideosService, private router: Router) { }

  ngOnInit(): void {
    this.loadVideos();
  }

  loadVideos(): void {
    this.loading.set(true);

    this.videoService.getMyVideos(this.page, this.size).subscribe({
      next: response => {
        this.videos.set(response.content);
        this.totalElements = response.totalElements;
        this.loading.set(false);
      },
      error: error => {
        console.error('Erro ao carregar vídeos:', error);
        this.loading.set(false);
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

      const thumbnail = await this.captureThumbnail(file);

      videoRequest.thumb = {
        contentType: 'image/jpeg',
        sizeBytes: thumbnail.size
      };
      try {
        
        const presignedUrlResponse = await firstValueFrom(this.videoService.uploadSmallVideo(videoRequest));

        const uploadResponse = await firstValueFrom(this.videoService.uploadSmallVideoToS3(presignedUrlResponse.videoUploadUrl, file));
        
        const thumbnailResponse = await firstValueFrom(this.videoService.uploadThumbnailToS3(presignedUrlResponse.thumbUploadUrl, thumbnail));
  
        const complete = await firstValueFrom(this.videoService.completeSmallVideo(presignedUrlResponse.videoId) );
      }catch (error) {
        console.error('Erro durante o upload do vídeo pequeno:', error);
      }

      this.closeUploadModal();
      this.loadVideos();

    } else {
      
      let chunkSize: number = 10 * 1024 * 1024; // 10 MB
      let totalChunks: number = Math.ceil(totalSize / chunkSize);

      try {

        const uploadId = await firstValueFrom(this.videoService.uploadLargeVideo(videoRequest));

        
        const thumbnail = await this.captureThumbnail(file);
        videoRequest.thumb = {
          contentType: 'image/jpeg',
          sizeBytes: thumbnail.size
        };
        const presignedUrls = await firstValueFrom(this.videoService.generatePresignedUrl(videoRequest, totalChunks, uploadId));

        const parts: PartsDto[] = [];

        
        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, totalSize);
          const chunk = file.slice(start, end);

          console.log(`Enviando parte ${i + 1}/${totalChunks}`);

          const response = await firstValueFrom(this.videoService.uploadLargeVideoToS3(presignedUrls.presignedUrls[i], chunk));

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

        const thumbnailResponse = await firstValueFrom(this.videoService.uploadThumbnailToS3(presignedUrls.thumbUploadUrl, thumbnail));
        const completeResponse = await firstValueFrom(this.videoService.completeLargeVideo(dto));

        this.closeUploadModal();
        this.loadVideos();

      } catch (error) {
        console.error('Erro durante o upload multipart:', error);
      }

    }
  }

  showDeleteModal = false;
  videoToDelete: Video | null = null;

  openDeleteModal(video: Video): void {
    this.videoToDelete = video;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.videoToDelete = null;
  }

  async deleteVideo(video: Video) {
    try {
      await firstValueFrom(
        this.videoService.deleteVideo(video.id)
      );

      this.closeDeleteModal();
      this.loadVideos();

    } catch (error) {
      console.error('Erro ao excluir vídeo:', error);
    }
  }
  async downloadVideo(video: Video) {
   
    try {
      const url = await firstValueFrom(
        this.videoService.downloadVideo(video.id)
      );
      window.location.href = url;
    } catch (error) {
      console.error('Erro ao obter URL de download:', error);
    }
  }

  logout() {
    sessionStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  async captureThumbnail(file: Blob): Promise<Blob> {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(
          new Error('Não foi possível carregar o vídeo')
        );
      });

      // Captura em 1 segundo ou no meio de vídeos muito curtos
      const time = Math.min(1, video.duration / 2);

      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(
          new Error('Não foi possível selecionar o frame')
        );

        video.currentTime = time;
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');

      if (!context || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Não foi possível capturar o frame');
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const thumbnail = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Falha ao converter thumbnail'));
            }
          },
          'image/jpeg',
          0.8
        );
      });

      return thumbnail;
    } finally {
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
    }
  }

  get totalPages(): number {
  return Math.ceil(this.totalElements / this.size);
}

get pages(): number[] {
  return Array.from(
    { length: this.totalPages },
    (_, index) => index
  );
}

goToPage(page: number): void {
  if (
    page < 0 ||
    page >= this.totalPages ||
    page === this.page
  ) {
    return;
  }

  this.page = page;
  this.loadVideos();
}

previousPage(): void {
  this.goToPage(this.page - 1);
}

nextPage(): void {
  this.goToPage(this.page + 1);
}
}
