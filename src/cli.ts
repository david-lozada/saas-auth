// src/cli.ts - Updated for better TTY/Docker compatibility
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BootstrapService } from './bootstrap/bootstrap.service';
import { SeedService } from './bootstrap/seed.service';
import * as crypto from 'crypto';
import * as readline from 'readline';

/**
 * Ask a standard question via readline
 */
async function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Ask for a password with masked input (only if TTY)
 */
function askPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const isTTY = !!stdin.isTTY;

    stdout.write(question);

    if (isTTY) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';

    const onData = (ch: any) => {
      const char = ch.toString();

      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          cleanup();
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          cleanup();
          process.exit();
          break;
        case '\b':
        case '\x7f':
        case '\x08':
          if (password.length > 0) {
            password = password.slice(0, -1);
            if (isTTY) {
              stdout.write('\b \b');
            }
          }
          break;
        default:
          // Only add printable characters to password
          if (char.length === 1 && char.charCodeAt(0) >= 32) {
            password += char;
            // Only mask if we actually have control over the terminal echo
            if (isTTY) {
              stdout.write('*');
            }
          }
          break;
      }
    };

    function cleanup() {
      stdin.removeListener('data', onData);
      if (isTTY) {
        stdin.setRawMode(false);
      }
      stdin.pause();
    }

    stdin.on('data', onData);
  });
}

async function validatePassword(password: string): Promise<string | true> {
  if (password.length < 12) return 'Password must be at least 12 characters';
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*?&]/.test(password);

  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return 'Password needs uppercase, lowercase, number, and special char (@$!%*?&)';
  }
  return true;
}

async function bootstrap() {
  console.log('\n=================================================');
  console.log('🔐 MULTITENANT AUTH - FIRST SUPER ADMIN SETUP');
  console.log('=================================================\n');

  // Validate environment
  if (process.env.NODE_ENV === 'production' && !process.env.SETUP_SECRET) {
    console.error(
      '❌ Error: SETUP_SECRET environment variable required in production',
    );
    console.error('   Generate one with: openssl rand -hex 32');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false, // Silent in CLI
  });

  const bootstrapService = app.get(BootstrapService);

  try {
    // Check if setup needed
    const requiresSetup = await bootstrapService.requiresSetup();
    if (!requiresSetup) {
      console.log('❌ System already initialized. Super admin exists.\n');
      await app.close();
      process.exit(1);
    }

    // Collect input
    const email = await ask('Super admin email: ');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('❌ Invalid email format');
      process.exit(1);
    }

    const password = await askPassword('Password (min 12 chars): ');
    const passwordValidation = await validatePassword(password);
    if (passwordValidation !== true) {
      console.error(`❌ ${passwordValidation}`);
      process.exit(1);
    }

    const passwordConfirm = await askPassword('Confirm password: ');
    if (password !== passwordConfirm) {
      console.error('❌ Passwords do not match');
      process.exit(1);
    }

    const firstName = await ask('First name: ');
    if (firstName.length < 2) {
      console.error('❌ First name too short');
      process.exit(1);
    }

    const lastName = await ask('Last name: ');
    if (lastName.length < 2) {
      console.error('❌ Last name too short');
      process.exit(1);
    }

    // Confirmation with hash of details
    const confirmHash = crypto
      .createHash('sha256')
      .update(email + firstName + lastName)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();

    console.log('\n-------------------------------------------------');
    console.log(`Email:    ${email}`);
    console.log(`Name:     ${firstName} ${lastName}`);
    console.log(`Confirm:  ${confirmHash}`);
    console.log('-------------------------------------------------');

    const confirm = await ask(`Type ${confirmHash} to confirm: `);
    if (confirm !== confirmHash) {
      console.log('\n❌ Confirmation failed. Setup cancelled.\n');
      await app.close();
      process.exit(0);
    }

    // Execute setup
    const { token } = await bootstrapService.generateSetupToken();

    const result = await bootstrapService.createFirstAdmin({
      email,
      password,
      firstName,
      lastName,
      setupToken: token,
    });

    // ⭐ NEW: Seed subscription plans
    console.log('\n=================================================');
    console.log('🌱 SEEDING SUBSCRIPTION PLANS');
    console.log('=================================================');
    const seedService = app.get(SeedService);
    await seedService.seedPlans();
    console.log('=================================================\n');

    // Success output
    console.log('\n=================================================');

    console.log('✅ SUPER ADMIN CREATED SUCCESSFULLY');
    console.log('=================================================');
    console.log(`📧 Email:      ${result.user.email}`);
    console.log(`🔑 Role:       ${result.user.roles.join(', ')}`);
    console.log(`🌐 Scope:      Global (all tenants)`);
    console.log(`🆔 ID:         ${result.user._id}`);
    console.log('');
    console.log('📋 LOGIN CREDENTIALS:');
    console.log('  POST http://localhost:3000/auth/super-admin/login');
    console.log('  Header: x-tenant-id: system');
    console.log(`  Body:   { "email": "${email}", "password": "********" }`);
    console.log('');
    console.log('⚠️  SECURITY NOTES:');
    console.log('  • Store credentials in password manager');
    console.log('  • Enable 2FA when available');
    console.log('  • Rotate password every 90 days');
    console.log('  • Never share super admin credentials');
    console.log('=================================================\n');

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Setup failed: ${error.message}\n`);
    await app.close();
    process.exit(1);
  }
}

bootstrap();
