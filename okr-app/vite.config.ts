/// <reference types="vitest" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5180
	},
	test: {
		include: ['tests/**/*.test.ts'],
		environment: 'node',
		passWithNoTests: false
	}
});