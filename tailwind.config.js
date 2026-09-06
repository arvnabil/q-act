import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
        './resources/js/**/*.js',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                brand: {
                    50:  '#e6f7f5',
                    100: '#b3e8e1',
                    200: '#80d9cd',
                    300: '#4dcab9',
                    400: '#26bfaa',
                    500: '#00a88f',
                    600: '#009680',
                    700: '#007d6b',
                    800: '#006557',
                    900: '#003d34',
                    950: '#002721',
                },
                surface: {
                    50:  '#fafbfc',
                    100: '#f1f4f8',
                    200: '#e8ecf1',
                    300: '#d5dbe3',
                    400: '#9ba5b4',
                    500: '#6b7a90',
                    600: '#4a5568',
                    700: '#374151',
                    800: '#1f2937',
                    900: '#111827',
                },
            },
        },
    },

    plugins: [forms],
};

