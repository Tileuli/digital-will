import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';

export class AuthController {
  // Регистрация
  static async register(req: Request, res: Response) {
    try {
      const { email, password, full_name, phone } = req.body;

      // Проверка существующего пользователя
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Хэширование пароля
      const hashedPassword = await bcrypt.hash(password, 10);

      // Создание пользователя
      const user = await User.create({
        email,
        password_hash: hashedPassword,
        full_name,
        phone,
        is_active: true,
      });

      // Преобразуем в объект и удаляем пароль
      const userData = user.get({ plain: true });
      const userResponse: any = { ...userData };
      delete userResponse.password_hash;

      // Генерация токена
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' } // Фиксированное значение
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: userResponse,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Вход
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Поиск пользователя
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ message: 'Invalid email' });
      }

      // Проверка пароля
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid password' });
      }

      // Проверка активности
      if (!user.is_active) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

      // Обновление времени последнего входа
      user.last_checkin = new Date();
      await user.save();

      // Преобразуем в объект и удаляем пароль
      const userData = user.get({ plain: true });
      const userResponse: any = { ...userData };
      delete userResponse.password_hash;

      // Генерация токена
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: userResponse,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Получение текущего пользователя
  static async getCurrentUser(req: Request, res: Response) {
    try {
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Преобразуем в объект и удаляем пароль
      const userData = user.get({ plain: true });
      const userResponse: any = { ...userData };
      delete userResponse.password_hash;

      res.json({ user: userResponse });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Выход
  static async logout(req: Request, res: Response) {
    res.json({ message: 'Logout successful' });
  }
}