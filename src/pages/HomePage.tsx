import React from 'react';
import { Hero } from '../components/home/Hero';
import { Stats } from '../components/home/Stats';
import { MissionVision } from '../components/home/MissionVision';
import { PageCards } from '../components/home/PageCards';
import { FeaturedProjects } from '../components/home/FeaturedProjects';
import { UpcomingEvents } from '../components/home/UpcomingEvents';
import { Testimonials } from '../components/home/Testimonials';
import { MeetOurMembers } from '../components/home/MeetOurMembers';
import { CallToAction } from '../components/home/CallToAction';

export const HomePage: React.FC = () => {
  return (
    <>
      <Hero />
      <Stats />
      <MissionVision />
      <PageCards />
      <FeaturedProjects />
      <MeetOurMembers limit={8} />
      <UpcomingEvents />
      <Testimonials />
      <CallToAction />
    </>
  );
};
