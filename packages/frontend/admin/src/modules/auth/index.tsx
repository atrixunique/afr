import { Button } from '@affine/admin/components/ui/button';
import { Input } from '@affine/admin/components/ui/input';
import { Label } from '@affine/admin/components/ui/label';
import { FeatureType, getUserFeaturesQuery } from '@affine/graphql';
import type { FormEvent } from 'react';
import { useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

import { isAdmin, useCurrentUser, useRevalidateCurrentUser } from '../common';
import logo from './logo.png';

export function Auth() {
  const currentUser = useCurrentUser();
  const revalidate = useRevalidateCurrentUser();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const login = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!emailRef.current || !passwordRef.current) return;
      fetch('/api/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({
          email: emailRef.current?.value,
          password: passwordRef.current?.value,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(async response => {
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '登录失败');
          }
          return response.json();
        })
        .then(() =>
          fetch('/graphql', {
            method: 'POST',
            body: JSON.stringify({
              operationName: getUserFeaturesQuery.operationName,
              query: getUserFeaturesQuery.query,
              variables: {},
            }),
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
        .then(res => res.json())
        .then(
          async ({
            data: {
              currentUser: { features },
            },
          }) => {
            if (features.includes(FeatureType.Admin)) {
              toast.success('登录成功');
              await revalidate();
            } else {
              toast.error('You are not an admin');
            }
          }
        )
        .catch(err => {
          toast.error(`登录失败: ${err.message}`);
        });
    },
    [revalidate]
  );

  if (currentUser && isAdmin(currentUser)) {
    return <Navigate to="/admin" />;
  }

  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px] h-screen">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-balance text-muted-foreground">
              请输入 Email 以登录
            </p>
          </div>
          <form onSubmit={login} action="#">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  ref={emailRef}
                  placeholder="mn@mn.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  ref={passwordRef}
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button onClick={login} type="submit" className="w-full">
                登录
              </Button>
            </div>
          </form>
        </div>
      </div>
      <div className="hidden bg-muted lg:flex lg:justify-center">
        <img
          src={logo}
          alt="Image"
          className="h-1/2 dark:brightness-[0.2] dark:grayscale relative top-1/4 "
        />
      </div>
    </div>
  );
}

export { Auth as Component };
