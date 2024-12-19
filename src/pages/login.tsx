"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

const Login = () => {
  const router = useRouter();

  const handleLogin = async () => {
    router.push('/game');
  };

  return (
    <div>
      <h1>Login</h1>
      
      <button onClick={handleLogin}>Login</button>
    </div>
  );
};

export default Login;