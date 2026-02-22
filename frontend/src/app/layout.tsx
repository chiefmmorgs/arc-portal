import type { Metadata } from 'next';
import './globals.css';
import Sidebar from './Sidebar';
import { AnimationProvider } from '@/lib/AnimationProvider';

export const metadata: Metadata = {
    title: 'ARC Portal',
    description: 'Validator monitoring, contract deployment, and NFT studio for ARC testnet',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Sidebar>
                    <AnimationProvider>{children}</AnimationProvider>
                </Sidebar>
            </body>
        </html>
    );
}
