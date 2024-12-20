import { sign_in } from "./sign_in";

export default function SignInWithGoogle() {
  return (
    <form action={sign_in}>
      <button
        type="submit"
        className="block w-full font-medium
         text-white rounded-lg text-center 
         p-1 bg-blue-400 my-3"
      >
        Sign in with Google
      </button>
    </form>
  );
}
