import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { VideosService } from '../../core/services/videos.service';
import { Video } from '../../models/video';
import { VideoRequest } from '../../models/videoRequest';
import { switchMap, map } from 'rxjs';

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
        console.log('3 - loading:', this.loading);
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

  uploadVideo(): void {

    if (!this.selectedFile) {
      return;
    }

    const file = this.selectedFile;
    
    const videoRequest: VideoRequest = {
      originalFilename: file.name,
      contentType: file.type,
      sizeBytes: file.size
    };

    if (file.size <= 10 * 1024 * 1024) {


      this.videoService.uploadSmallVideo(videoRequest)
        .pipe(
          switchMap(response => {
            return this.videoService.uploadSmallVideoToS3(response.presignedUrl,file)
              .pipe(
                map(() => response.videoId)
              );
          }),
          switchMap(videoId => {
            return this.videoService.completeSmallVideo(videoId);
          })

        ).subscribe({
          next: completeResponse => {
            console.log('Upload completo:',completeResponse);
            this.closeUploadModal();
            this.loadVideos();
          },
          error: error => {
            console.error('Erro durante o upload:',error);
          }
        });

    } else {

      this.videoService.uploadLargeVideo(videoRequest)
        .subscribe({
          next: response => {
            console.log('Upload de vídeo grande iniciado:',response);
            this.uploadId = response;
          },
          error: error => {
            console.error('Erro ao iniciar upload de vídeo grande:',error);
          }
        });
        
        let presignedUrlResponse: string[] = [];

        this.videoService.generatePresignedUrl(videoRequest, 1, this.uploadId)
        .subscribe({
          next: response => {
            console.log('Presigned URL gerada:',response);
            presignedUrlResponse = response;
          },
          error: error => {
            console.error('Erro ao gerar presigned URL:',error);
          }
        });

        let totalSize: number = file.size;
        let chunkSize: number = 10 * 1024 * 1024; // 10 MB
        let totalChunks: number = Math.ceil(totalSize / chunkSize);
        
        for(let i = 0; i < totalChunks; i++) {
          let start: number = i * chunkSize;
          let end: number = Math.min(start + chunkSize, totalSize);
          let chunk: Blob = file.slice(start, end);

          this.videoService.uploadLargeVideoToS3(presignedUrlResponse[i], chunk as File)
            .subscribe({
              next: () => {
                console.log(`Chunk ${i + 1} de ${totalChunks} enviado com sucesso.`);
              },
              error: error => {
                console.error(`Erro ao enviar chunk ${i + 1}:`, error);
              }
            });

      }

    }
  }
}
