import {
  Controller,
  Request,
  Post,
  Get,
  UseGuards,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ILoginResponse, IUserResponse, ICreateUserDto } from 'src/models/auth';

interface JwtAuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

interface LocalAuthenticatedRequest extends Request {
  user: IUserResponse;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Request() req: LocalAuthenticatedRequest): Promise<ILoginResponse> {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(
    @Body() createUserDto: ICreateUserDto,
  ): Promise<IUserResponse> {
    return this.authService.register(createUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(
    @Request() req: JwtAuthenticatedRequest,
  ): Promise<IUserResponse> {
    return this.authService.getProfile(req.user.userId);
  }
}
