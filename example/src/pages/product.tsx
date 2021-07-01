import React from 'react';
import Image from '../components/Image';
import Layout from '../components/Layout';

export default function() {
    return (
        <Layout>
            Kos
            <Image src="/images/product-1.jpg" width={50} height={100} />
        </Layout>
    );
}
