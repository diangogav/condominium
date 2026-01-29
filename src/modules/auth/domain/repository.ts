export interface AuthSession {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: {
        id: string;
        email?: string;
    };
}

export interface IAuthRepository {
    signUp(email: string, password: string): Promise<{ id: string; email?: string }>;
    signIn(email: string, password: string): Promise<AuthSession>;
}
