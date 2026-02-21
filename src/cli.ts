// src/cli.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BootstrapService } from './bootstrap/bootstrap.service';
import prompts from 'prompts';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const bootstrapService = app.get(BootstrapService);

  try {
    const requiresSetup = await bootstrapService.requiresSetup();
    if (!requiresSetup) {
      console.log('\n❌ System already initialized.\n');
      await app.close();
      process.exit(1);
    }

    console.log('\n=================================================');
    console.log('🔐 FIRST ADMIN SETUP');
    console.log('=================================================\n');

    const answers = await prompts([
      {
        type: 'text',
        name: 'email',
        message: 'Admin email:',
        validate: (input: string) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) || 'Invalid email',
      },
      {
        type: 'password',
        name: 'password',
        message: 'Admin password (min 12 chars):',
        validate: (input: string) => {
          if (input.length < 12) return 'Password must be at least 12 characters';
          const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
          return strongRegex.test(input)
            ? true
            : 'Password needs uppercase, lowercase, number, and special char';
        },
      },
      {
        type: 'text',
        name: 'firstName',
        message: 'First name:',
        validate: (input: string) => (input.length >= 2 ? true : 'Too short'),
      },
      {
        type: 'text',
        name: 'lastName',
        message: 'Last name:',
        validate: (input: string) => (input.length >= 2 ? true : 'Too short'),
      },
      {
        type: 'confirm',
        name: 'proceed',
        message: (prev, values) => `Create superadmin ${values.email}? This cannot be undone.`,
        initial: false,
      },
    ]);

    if (!answers || !answers.proceed) {
      console.log('\n❌ Setup cancelled\n');
      await app.close();
      process.exit(0);
    }

    const { token } = await bootstrapService.generateSetupToken();

    const result = await bootstrapService.createFirstAdmin({
      email: answers.email,
      password: answers.password,
      firstName: answers.firstName,
      lastName: answers.lastName,
      setupToken: token,
    });

    console.log('\n=================================================');
    console.log('✅ SETUP COMPLETE');
    console.log('=================================================');
    console.log(`📧 Email: ${result.user.email}`);
    console.log(`🏢 Tenant: ${result.tenant.name} (${result.tenant.slug})`);
    console.log('');
    console.log('🔑 Login at: POST http://localhost:3000/auth/web/login');
    console.log('=================================================\n');

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await app.close();
    process.exit(1);
  }
}

bootstrap();