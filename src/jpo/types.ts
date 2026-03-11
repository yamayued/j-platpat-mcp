export interface JpoApiResult<TData = unknown> {
  statusCode: string;
  errorMessage: string;
  remainAccessCount: string;
  data: TData;
}

export interface JpoApiResponse<TData = unknown> {
  result: JpoApiResult<TData>;
}

export interface JpoTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
}
