import React from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  // Svg: React.ComponentType<React.ComponentProps<"svg">>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Seamless Integration with Blockchain',
    // Svg: require("@site/static/img/undraw_docusaurus_mountain.svg").default,
    description: (
      <>
        Our library is built to effortlessly integrate with the Cartesi
        blockchain, providing developers with a simple way to validate game
        outcomes on-chain while ensuring scalability and security.
      </>
    ),
  },
  {
    title: 'Focus on What Matters',
    // Svg: require("@site/static/img/undraw_docusaurus_tree.svg").default,
    description: (
      <>
        Let us handle the blockchain complexities. With our game library, you
        can focus on designing engaging games while we take care of secure
        backend interactions and state management.
      </>
    ),
  },
  {
    title: 'Inspired by Boardgame.io',
    // Svg: require("@site/static/img/undraw_docusaurus_react.svg").default,
    description: (
      <>
        Leverage the proven architecture of Boardgame.io, enhanced with
        blockchain capabilities. Enjoy a familiar structure while accessing new
        features like verifiable randomness and secure game state storage.
      </>
    ),
  },
];

// function Feature({ title, Svg, description }: FeatureItem) {
function Feature({ title, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        {/* <Svg className={styles.featureSvg} role="img" /> */}
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
