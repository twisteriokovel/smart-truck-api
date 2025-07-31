import { Controller, Request, Post, UseGuards, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ILoginResponse, IUserResponse, ICreateUserDto } from 'src/models/auth';

interface AuthenticatedRequest extends Request {
  user: IUserResponse;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Request() req: AuthenticatedRequest): Promise<ILoginResponse> {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(
    @Body() createUserDto: ICreateUserDto,
  ): Promise<IUserResponse> {
    return this.authService.register(createUserDto);
  }
}
