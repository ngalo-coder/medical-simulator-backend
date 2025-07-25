const User = require('../../../models/User');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          institution: 'Test University'
        }
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.profile.firstName).toBe(userData.profile.firstName);
      expect(savedUser.role).toBe('student'); // default role
      expect(savedUser.password).not.toBe(userData.password); // should be hashed
    });

    it('should hash password before saving', async () => {
      const password = 'TestPass123';
      const user = new User({
        email: 'test@example.com',
        password,
        profile: {
          firstName: 'John',
          lastName: 'Doe'
        }
      });

      await user.save();
      
      expect(user.password).not.toBe(password);
      expect(await bcrypt.compare(password, user.password)).toBe(true);
    });

    it('should not allow duplicate emails', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'TestPass123',
        profile: {
          firstName: 'John',
          lastName: 'Doe'
        }
      };

      await new User(userData).save();
      
      const duplicateUser = new User(userData);
      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should require email and password', async () => {
      const user = new User({
        profile: {
          firstName: 'John',
          lastName: 'Doe'
        }
      });

      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('User Methods', () => {
    let user;

    beforeEach(async () => {
      user = await global.testUtils.createTestUser();
    });

    it('should compare passwords correctly', async () => {
      const isMatch = await user.comparePassword('TestPass123');
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('WrongPassword');
      expect(isNotMatch).toBe(false);
    });

    it('should generate full name virtual', () => {
      expect(user.fullName).toBe('Test User');
    });

    it('should check achievements correctly', () => {
      user.statistics.casesCompleted = 1;
      const achievements = user.checkAchievements();
      
      expect(achievements).toHaveLength(1);
      expect(achievements[0].name).toBe('First Steps');
    });
  });

  describe('User Validation', () => {
    it('should validate email format', async () => {
      const user = new User({
        email: 'invalid-email',
        password: 'TestPass123',
        profile: {
          firstName: 'John',
          lastName: 'Doe'
        }
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should validate password length', async () => {
      const user = new User({
        email: 'test@example.com',
        password: '123', // too short
        profile: {
          firstName: 'John',
          lastName: 'Doe'
        }
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should validate role enum', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'TestPass123',
        role: 'invalid-role',
        profile: {
          firstName: 'John',
          lastName: 'Doe'
        }
      });

      await expect(user.save()).rejects.toThrow();
    });
  });
});