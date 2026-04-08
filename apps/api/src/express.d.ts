declare namespace Express {
  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    locale: string;
    isActive: boolean;
  }

  interface Request {
    user?: User;
  }
}
