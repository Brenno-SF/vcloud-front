
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environments';
import { Video } from '../../models/video';
import { tap } from 'rxjs';
import { VideoRequest } from '../../models/videoRequest';

@Injectable({
  providedIn: 'root'
})
export class VideosService {
  private apiUrl = environment.apiUrl; 

  constructor(private http: HttpClient) {}
  
  getMyVideos() {
    return this.http.get<Video[]>(this.apiUrl+'/videos');
  }

  uploadSmallVideo(videoRequest: VideoRequest) {
    return this.http.post<any>(this.apiUrl+'/upload-single-presigned-url', videoRequest); 
  }

  uploadSmallVideoToS3(presignedUrl: string, file: File) {
    return this.http.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type
      },
      responseType: 'text' // Define o tipo de resposta como texto
    });
  }
  completeSmallVideo(videoId: string) {
    return this.http.post<Video>(this.apiUrl+`/complete-singleupload/${videoId}`, {}); 
  }

  uploadLargeVideo(videoRequest: VideoRequest) {
    return this.http.post<string>(this.apiUrl+'/start-multipart', videoRequest); 
  }

  generatePresignedUrl(videoRequest: VideoRequest, partNumbers: number, uploadId: string) {
    return this.http.post<string[]>(this.apiUrl+`/generate-multipart-presigned-url/${partNumbers}/${uploadId}`, videoRequest); 
  }

  uploadLargeVideoToS3(presignedUrl: string, file: File) {
    return this.http.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type
      },
      responseType: 'text' // Define o tipo de resposta como texto
    });
  }
}