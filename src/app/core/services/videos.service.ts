
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environments';
import { Video } from '../../models/video';
import { Observable, tap } from 'rxjs';
import { VideoRequest } from '../../models/videoRequest';
import { CompleteUploadDto } from '../../dto/CompleteUploadDto';

@Injectable({
  providedIn: 'root'
})
export class VideosService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getMyVideos() {
    return this.http.get<Video[]>(this.apiUrl + '/videos');
  }

  uploadSmallVideo(videoRequest: VideoRequest) {
    return this.http.post<any>(this.apiUrl + '/videos/upload-single-presigned-url', videoRequest);
  }

  uploadSmallVideoToS3(presignedUrl: string, file: File) {
    return this.http.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      observe: 'response',
      responseType: 'text' // Define o tipo de resposta como texto
    });
  }
  completeSmallVideo(videoId: string) {
    return this.http.post<Video>(this.apiUrl + `/videos/complete-singleupload/${videoId}`, {});
  }

  uploadLargeVideo(videoRequest: VideoRequest): Observable<string> {
  return this.http.post(this.apiUrl + '/videos/start-multipart',videoRequest,{responseType: 'text'});
}

  generatePresignedUrl(videoRequest: VideoRequest, partNumbers: number, uploadId: string) {
    return this.http.post<string[]>(this.apiUrl + `/videos/generate-multipart-presigned-url/${partNumbers}/${uploadId}`, videoRequest);
  }

  uploadLargeVideoToS3(presignedUrl: string, file: Blob) {
    return this.http.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type
      },
      observe: 'response',
      responseType: 'text'
    });
  }

  completeLargeVideo(dto: CompleteUploadDto) {
    return this.http.post<Video>(this.apiUrl + `/videos/complete-multipart`, dto);
  }
}