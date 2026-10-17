
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environments';
import { Video } from '../../models/video';
import { Observable, tap } from 'rxjs';
import { VideoRequest } from '../../models/videoRequest';
import { CompleteUploadDto } from '../../dto/CompleteUploadDto';
import { PageResponse } from '../../models/paginationResponose';

@Injectable({
  providedIn: 'root'
})
export class VideosService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getMyVideos(page: number, pageSize: number): Observable<PageResponse<Video>> {
    const params =  new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
    return this.http.get<PageResponse<Video>>(this.apiUrl + '/videos', { params });
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

  uploadThumbnailToS3(presignedUrl: string, file: Blob) {
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
    return this.http.post<any>(this.apiUrl + `/videos/generate-multipart-presigned-url/${partNumbers}/${uploadId}`, videoRequest);
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

  deleteVideo(videoId: string) {
    return this.http.delete(this.apiUrl + `/videos/delete/${videoId}`);
  }

  downloadVideo(videoId: string) {
    return this.http.get(this.apiUrl + `/videos/download/${videoId}`, { responseType: 'text' });
  }
}