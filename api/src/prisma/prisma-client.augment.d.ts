import '@prisma/client';

/**
 * Temporary PrismaClient type augmentation.
 *
 * In this repo we use TypeScript's `moduleResolution: nodenext` + `resolvePackageJsonExports: true`.
 * Occasionally the TS language service can lag behind Prisma Client generation, and new model delegates
 * (e.g. `prisma.exam`, `prisma.examQuestion`) are reported as missing even though they exist at runtime.
 *
 * This augmentation ensures the app can compile while still using the generated client at runtime.
 */
declare module '@prisma/client' {
  // Match PrismaClient generic shape so declaration merging works.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface PrismaClient<T = any, U = any, ExtArgs = any> {
    exam: any;
    examQuestion: any;
  }
}


