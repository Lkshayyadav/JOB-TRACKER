import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

const getAccessSecret = () => process.env.JWT_ACCESS_SECRET || 'access_secret_123_key';
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || 'refresh_secret_123_key';

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ id: userId }, getAccessSecret(), { expiresIn: '15m' });
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ id: userId }, getRefreshSecret(), { expiresIn: '7d' });
};

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: Partial<IUser>): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const { name, email, password, avatar } = data;

    if (!name || !email || !password) {
      const error = new Error('Name, email, and password are required');
      (error as any).statusCode = 400;
      throw error;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error('User with this email already exists');
      (error as any).statusCode = 400;
      throw error;
    }

    const user = new User({
      name,
      email,
      password,
      avatar
    });

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // Save refresh token to user document
    user.refreshTokens = [refreshToken];
    await user.save();

    // Remove password before returning
    const userJson = user.toObject();
    delete userJson.password;

    return {
      user: userJson as IUser,
      accessToken,
      refreshToken
    };
  }

  /**
   * Log in user
   */
  static async login(email: string, password: string): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    if (!email || !password) {
      const error = new Error('Email and password are required');
      (error as any).statusCode = 400;
      throw error;
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      const error = new Error('Invalid email or password');
      (error as any).statusCode = 401;
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      (error as any).statusCode = 401;
      throw error;
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // Add new refresh token (and optionally clean up expired ones by keeping max list size, e.g. 5)
    user.refreshTokens.push(refreshToken);
    if (user.refreshTokens.length > 5) {
      user.refreshTokens.shift(); // Remove oldest
    }
    await user.save();

    const userJson = user.toObject();
    delete userJson.password;

    return {
      user: userJson as IUser,
      accessToken,
      refreshToken
    };
  }

  /**
   * Refresh JWT access token
   */
  static async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!token) {
      const error = new Error('Refresh token is required');
      (error as any).statusCode = 400;
      throw error;
    }

    try {
      const decoded: any = jwt.verify(token, getRefreshSecret());
      const user = await User.findById(decoded.id);

      if (!user || !user.refreshTokens.includes(token)) {
        const error = new Error('Invalid refresh token');
        (error as any).statusCode = 401;
        throw error;
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken(user._id.toString());
      const newRefreshToken = generateRefreshToken(user._id.toString());

      // Replace old refresh token in user's token list
      user.refreshTokens = user.refreshTokens.filter(t => t !== token);
      user.refreshTokens.push(newRefreshToken);
      await user.save();

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (err) {
      const error = new Error('Invalid or expired refresh token');
      (error as any).statusCode = 401;
      throw error;
    }
  }

  /**
   * Log out user (revoke refresh token)
   */
  static async logout(token: string): Promise<void> {
    if (!token) return;

    try {
      const decoded: any = jwt.verify(token, getRefreshSecret());
      const user = await User.findById(decoded.id);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter(t => t !== token);
        await user.save();
      }
    } catch (err) {
      // Ignore token verification errors during logout, just complete
    }
  }
}

