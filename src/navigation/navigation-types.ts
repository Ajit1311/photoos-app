import type { NavigatorScreenParams } from "@react-navigation/native";

export type MarketplaceStackParamList = {
  MarketplaceHome: {
    filters?: {
      location?: string;
      area?: string;
      priceRange?: string;
      rating?: string;
      services?: string[];
    };
  } | undefined;

  StudioDetails: {
    studioId?: string;
    studioName?: string;
  };
  MarketplaceBooking: {
    studioId: string;
    studioName?: string;
  };

  MarketplaceFilters: undefined;
};

export type MainTabParamList = {
  Home: undefined;

  Marketplace:
    | NavigatorScreenParams<MarketplaceStackParamList>
    | undefined;

  Camera: undefined;

  Chat: undefined;

  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Main:
    | NavigatorScreenParams<MainTabParamList>
    | undefined;

  SelfiePreview: {
    selfieUri: string;
  };

  FaceMatchResults: {
    selfieUri?: string;
  };

  Conversation: {
    conversationId?: string;
    title?: string;
    studioId?: string;
    studioName?: string;
    isCorporate?: boolean;
    eventName?: string;
  };

  Language: undefined;
  Appearance: undefined;
  Settings: undefined;
  Notifications: undefined;
  Bookings: undefined;
  ClientBookingReview: {
    bookingId: string;
    bookingTitle?: string | null;
  };
  Albums: undefined;
  Payments: undefined;
  FavoriteStudios: undefined;
  DeleteAccount: undefined;
};
