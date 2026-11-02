import { photoosRequest } from "../api/photoos-api";

export type ClientProfile = {
  id?: string;
  profile_id?: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  profile?: Record<string, unknown> | null;
};

export type BookingSummary = {
  id?: string;
  booking_id?: string;
  event_id?: string;
  title?: string | null;
  event_name?: string | null;
  status?: string | null;
  start_at?: string | null;
  event_date?: string | null;
  studio_name?: string | null;
  studio_id?: string | null;
};

export type AlbumRecent = {
  id?: string;
  album_id?: string;
  name?: string | null;
  title?: string | null;
  cover_url?: string | null;
  created_at?: string | null;
};

export type MarketplaceStudio = {
  id?: string;
  studio_id?: string;
  name?: string | null;
  studio_name?: string | null;
  city?: string | null;
  location?: string | null;
  category?: string | null;
  rating?: number | null;
  review_count?: number | null;
  verified?: boolean | null;
  is_verified?: boolean | null;
  image_url?: string | null;
};

export type StudioProfile = MarketplaceStudio & {
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  services?: unknown[];
  packages?: unknown[];
  offers?: unknown[];
  reviews?: unknown[];
};

export async function getClientProfile(): Promise<unknown> {
  return photoosRequest("client-profile", {
    method: "POST",
    body: JSON.stringify({
      action: "get",
    }),
  });
}

export type UpdateClientProfileInput = {
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
};

export async function updateClientProfile(
  input: UpdateClientProfileInput,
): Promise<unknown> {
  return photoosRequest("client-profile", {
    method: "POST",
    body: JSON.stringify({
      action: "update",
      full_name: input.full_name,
      phone: input.phone ?? null,
      avatar_url: input.avatar_url ?? null,
    }),
  });
}

export async function getBookingSummary(): Promise<unknown> {
  return photoosRequest("get-booking-summary", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getRecentAlbum(): Promise<unknown> {
  return photoosRequest("album-recent", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function searchMarketplaceStudios(
  query = "",
): Promise<unknown> {
  return photoosRequest("search-marketplace-studios", {
    method: "POST",
    body: JSON.stringify({
      query,
      search: query,
    }),
  });
}

export async function getMarketplaceStudioProfile(
  studioId: string,
): Promise<unknown> {
  return photoosRequest("get-marketplace-studio-profile", {
    method: "POST",
    body: JSON.stringify({
      studio_id: studioId,
    }),
  });
}

export async function getClientMarketplaceStudios(
  params?: { city?: string; area?: string; category?: string; search?: string; limit?: number } | number,
): Promise<unknown> {
  const queryObj = typeof params === "object" && params !== null ? params : {};
  try {
    const url = new URL("https://app.photoos.in/api/marketplace/studios");
    if (queryObj.city && queryObj.city !== "all") url.searchParams.set("city", queryObj.city);
    if (queryObj.area && queryObj.area !== "all") url.searchParams.set("area", queryObj.area);
    if (queryObj.category && queryObj.category !== "All") url.searchParams.set("category", queryObj.category);
    if (queryObj.search) url.searchParams.set("search", queryObj.search);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.studios) return data.studios;
    }
  } catch (err) {
    console.warn("[ClientAppService] Direct marketplace fetch notice:", err);
  }

  return photoosRequest("get-client-marketplace-studios", {
    method: "POST",
    body: JSON.stringify(queryObj),
  });
}

export async function getNearbyStudios(): Promise<unknown> {
  return photoosRequest("get-nearby-studios", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getFavoriteStudios(): Promise<unknown> {
  return photoosRequest("get-favorite-studios", {
    method: "POST",
    body: JSON.stringify({}),
  });
}


export async function startClientMarketplaceChat(
  studioId: string,
  studioName?: string,
): Promise<unknown> {
  return photoosRequest("client-marketplace-chat", {
    method: "POST",
    body: JSON.stringify({
      action: "start",
      studio_id: studioId,
      studio_name: studioName,
    }),
  });
}

export async function getClientMarketplaceChats(): Promise<unknown> {
  return photoosRequest("client-marketplace-chat", {
    method: "POST",
    body: JSON.stringify({
      action: "list",
    }),
  });
}

export async function getClientMarketplaceMessages(
  conversationId: string,
): Promise<unknown> {
  return photoosRequest("client-marketplace-chat", {
    method: "POST",
    body: JSON.stringify({
      action: "messages",
      conversation_id: conversationId,
    }),
  });
}

export async function sendClientMarketplaceMessage(
  conversationId: string,
  content: string,
): Promise<unknown> {
  return photoosRequest("client-marketplace-chat", {
    method: "POST",
    body: JSON.stringify({
      action: "send",
      conversation_id: conversationId,
      content,
    }),
  });
}



export async function prepareClientMarketplaceChatAttachment(
  conversationId: string,
  fileName: string,
  fileType?: string | null,
  fileSize?: number | null,
): Promise<unknown> {
  return photoosRequest("client-marketplace-chat", {
    method: "POST",
    body: JSON.stringify({
      action: "prepare_attachment",
      conversation_id: conversationId,
      file_name: fileName,
      file_type: fileType ?? null,
      file_size: fileSize ?? null,
    }),
  });
}

export async function createClientMarketplaceAttachmentMessage(
  conversationId: string,
  messageType: "image" | "file",
  content = "",
): Promise<unknown> {
  return photoosRequest("client-marketplace-chat", {
    method: "POST",
    body: JSON.stringify({
      action: "create_attachment_message",
      conversation_id: conversationId,
      message_type: messageType,
      content,
    }),
  });
}

export async function completeClientMarketplaceChatAttachment(
  messageId: string,
  attachmentId: string,
  storagePath: string,
  fileName: string,
  fileType?: string | null,
  fileSize?: number | null,
  metadata?: Record<string, unknown>,
): Promise<unknown> {
  return photoosRequest("client-marketplace-chat", {
    method: "POST",
    body: JSON.stringify({
      action: "complete_attachment",
      message_id: messageId,
      attachment_id: attachmentId,
      storage_path: storagePath,
      file_name: fileName,
      file_type: fileType ?? null,
      file_size: fileSize ?? null,
      metadata: metadata ?? {},
    }),
  });
}

export async function getClientChatConversations(): Promise<unknown> {
  return photoosRequest("get-client-chat-conversations", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getClientChatMessages(
  conversationId: string,
  limit = 100,
  before?: string,
): Promise<unknown> {
  return photoosRequest("get-client-chat-messages", {
    method: "POST",
    body: JSON.stringify({
      conversation_id: conversationId,
      limit,
      before: before ?? null,
    }),
  });
}

export async function markClientChatMessageRead(
  conversationId: string,
  messageId: string,
): Promise<unknown> {
  return photoosRequest("mark-client-chat-message-read", {
    method: "POST",
    body: JSON.stringify({
      conversation_id: conversationId,
      message_id: messageId,
    }),
  });
}

export async function getClientChatUnreadCount(
  conversationId?: string,
): Promise<unknown> {
  return photoosRequest("get-client-chat-unread-count", {
    method: "POST",
    body: JSON.stringify({
      conversation_id: conversationId ?? null,
    }),
  });
}




export type MarketplaceBookingRequestInput = {
  studio_id: string;
  requested_date: string;
  requested_start_time?: string | null;
  requested_end_time?: string | null;
  event_type?: string | null;
  venue?: string | null;
  guest_count?: number | null;
  budget?: number | null;
  customer_message?: string | null;
};

export type MarketplaceBookingRequestResponse = {
  success?: boolean;
  order_id?: string;
  booking_request_id?: string;
  order_number?: string;
  vendor_id?: string;
  studio_id?: string;
  status?: string;
  message?: string;
};

export type MarketplaceStudioAvailabilityStatus =
  | "available"
  | "half_day"
  | "unavailable";

export type MarketplaceStudioAvailabilityDay = {
  availability_date: string;
  availability_status: MarketplaceStudioAvailabilityStatus;
  start_time?: string | null;
  end_time?: string | null;
  source?: "default" | "studio" | "booking" | string | null;
};

export async function getMarketplaceStudioAvailability(
  studioId: string,
  fromDate: string,
  toDate: string,
): Promise<MarketplaceStudioAvailabilityDay[]> {
  const response = await photoosRequest(
    "client-marketplace-availability",
    {
      method: "POST",
      body: JSON.stringify({
        action: "availability",
        studio_id: studioId,
        from_date: fromDate,
        to_date: toDate,
      }),
    },
  ) as any;

  console.log(
    "[MarketplaceAvailability] raw response:",
    JSON.stringify(response),
  );

  const candidates = [
    response?.availability,
    response?.data?.availability,
    response?.data?.data?.availability,
    response?.result?.availability,
    response?.result?.data?.availability,
  ];

  const rows =
    candidates.find((value) => Array.isArray(value)) ?? [];

  console.log(
    "[MarketplaceAvailability] normalized rows:",
    JSON.stringify(rows),
  );

  return rows
    .filter(
      (row: any) =>
        row &&
        typeof row.availability_date === "string",
    )
    .map(
      (row: any): MarketplaceStudioAvailabilityDay | null => {
        const rawStatus =
          String(
            row.availability_status ??
              row.status ??
              row.availabilityStatus ??
              "",
          )
            .toLowerCase()
            .trim()
            .replace(/[-\s]+/g, "_");

        if (
          rawStatus !== "available" &&
          rawStatus !== "half_day" &&
          rawStatus !== "unavailable"
        ) {
          console.warn(
            "[MarketplaceAvailability] unknown status:",
            JSON.stringify(row),
          );
          return null;
        }

        return {
          availability_date:
            row.availability_date.slice(0, 10),

          availability_status:
            rawStatus,

          start_time:
            row.start_time ?? null,

          end_time:
            row.end_time ?? null,

          source:
            row.source ?? null,
        };
      },
    )
    .filter(
      (row): row is MarketplaceStudioAvailabilityDay =>
        row !== null,
    );
}

export async function getMarketplaceStudioBookedDates(
  studioId: string,
  fromDate: string,
  toDate: string,
): Promise<unknown> {
  return photoosRequest("client-marketplace-booking", {
    method: "POST",
    body: JSON.stringify({
      action: "booked_dates",
      studio_id: studioId,
      from_date: fromDate,
      to_date: toDate,
    }),
  });
}

export async function createMarketplaceBookingRequest(
  input: MarketplaceBookingRequestInput,
): Promise<MarketplaceBookingRequestResponse> {
  return photoosRequest("client-marketplace-booking", {
    method: "POST",
    body: JSON.stringify({
      action: "create",
      studio_id: input.studio_id,
      requested_date: input.requested_date,
      requested_start_time: input.requested_start_time ?? null,
      requested_end_time: input.requested_end_time ?? null,
      event_type: input.event_type ?? null,
      venue: input.venue ?? null,
      guest_count: input.guest_count ?? null,
      budget: input.budget ?? null,
      customer_message: input.customer_message ?? null,
    }),
  });
}

export type ClientBooking = {
  id?: string;
  booking_number?: string | null;
  studio_id?: string | null;
  project_id?: string | null;
  title?: string | null;
  event_type?: string | null;
  status?: string | null;
  payment_status?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  venue_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  guest_count?: number | null;
  advance_amount?: number | null;
  total_amount?: number | null;
  currency?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ClientAlbum = {
  id?: string;
  studio_id?: string | null;
  project_id?: string | null;
  code?: string | null;
  title?: string | null;
  slug?: string | null;
  description?: string | null;
  album_type?: string | null;
  cover_asset_id?: string | null;
  sequence?: number | null;
  visibility?: string | null;
  status?: string | null;
  is_favorite?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ClientPayment = {
  id?: string;
  studio_id?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  invoice_id?: string | null;
  payment_number?: string | null;
  payment_type?: string | null;
  payment_mode?: string | null;
  status?: string | null;
  method?: string | null;
  amount?: number | null;
  tax_amount?: number | null;
  total_amount?: number | null;
  currency?: string | null;
  transaction_id?: string | null;
  payment_date?: string | null;
  due_date?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ClientBookingReview = {
  id: string;
  booking_id: string;
  studio_id: string;
  rating: number;
  title?: string | null;
  review?: string | null;
  status: "pending" | "published" | "rejected";
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function submitClientBookingReview(params: {
  booking_id: string;
  rating: number;
  title?: string | null;
  review?: string | null;
}): Promise<{
  success: boolean;
  data?: {
    success: boolean;
    review_id: string;
    status: "pending";
    booking_id: string;
  };
}> {
  return photoosRequest("client-booking-review", {
    method: "POST",
    body: JSON.stringify({
      action: "submit",
      booking_id: params.booking_id,
      rating: params.rating,
      title: params.title ?? null,
      review: params.review ?? null,
    }),
  }) as Promise<{
    success: boolean;
    data?: {
      success: boolean;
      review_id: string;
      status: "pending";
      booking_id: string;
    };
  }>;
}

export async function getClientBookingReviews(): Promise<{
  success: boolean;
  data?: {
    success: boolean;
    reviews: ClientBookingReview[];
  };
}> {
  return photoosRequest("client-booking-review", {
    method: "POST",
    body: JSON.stringify({
      action: "list",
    }),
  }) as Promise<{
    success: boolean;
    data?: {
      success: boolean;
      reviews: ClientBookingReview[];
    };
  }>;
}

export async function getClientBookings(): Promise<{
  success: boolean;
  clientId?: string | null;
  bookings: ClientBooking[];
  marketplaceBookings?: unknown[];
}> {
  const response = await photoosRequest<{
    success: boolean;
    clientId?: string | null;
    bookings?: ClientBooking[];
    marketplaceBookings?: any[];
  }>("client-bookings", {
    method: "POST",
    body: JSON.stringify({}),
  });

  const normalBookings = Array.isArray(response.bookings)
    ? response.bookings
    : [];

  const marketplaceBookings = Array.isArray(response.marketplaceBookings)
    ? response.marketplaceBookings
    : [];

  const normalizedMarketplaceBookings: ClientBooking[] =
    marketplaceBookings.map((item: any) => {
      const order = item?.marketplace_orders ?? {};

      return {
        id: item?.id ?? item?.order_id ?? undefined,
        booking_number:
          order?.order_number ??
          item?.order_id ??
          null,
        studio_id: order?.studio_id ?? null,
        project_id: null,
        title: item?.event_type ?? "Marketplace Booking",
        event_type: item?.event_type ?? null,
        status: item?.status ?? "pending",
        payment_status: "Not applicable",
        event_date: item?.requested_date ?? null,
        event_time: item?.requested_start_time
          ? String(item.requested_start_time).slice(0, 5)
          : null,
        venue_name: item?.venue ?? null,
        address: null,
        city: null,
        state: null,
        country: null,
        guest_count: item?.guest_count ?? null,
        advance_amount: null,
        total_amount:
          item?.budget ?? order?.total_amount ?? null,
        currency: order?.currency ?? "INR",
        created_at: item?.created_at ?? null,
        updated_at: item?.updated_at ?? null,
        booking_source: "marketplace",
        order_id: item?.order_id ?? null,
        customer_message: item?.customer_message ?? null,
      };
    });

  return {
    ...response,
    bookings: [
      ...normalBookings,
      ...normalizedMarketplaceBookings,
    ].sort((a, b) => {
      const aTime = a.event_date
        ? new Date(a.event_date).getTime()
        : 0;

      const bTime = b.event_date
        ? new Date(b.event_date).getTime()
        : 0;

      return bTime - aTime;
    }),
    marketplaceBookings,
  };
}

export type ClientBookingCancellationInput = {
  booking_id: string;
  reason_code: string;
  reason_note?: string | null;
  is_genuine?: boolean;
};

export async function cancelClientBooking(
  input: ClientBookingCancellationInput,
): Promise<{
  success: boolean;
  message?: string;
  data?: ClientBooking;
}> {
  return photoosRequest("booking-cancel", {
    method: "POST",
    body: JSON.stringify({
      bookingId: input.booking_id,
      reasonCode: input.reason_code,
      reasonNote: input.reason_note ?? null,
      isGenuine: input.is_genuine ?? true,
      actorType: "client",
    }),
  }) as Promise<{
    success: boolean;
    message?: string;
    data?: ClientBooking;
  }>;
}

export async function getClientAlbums(): Promise<{
  success: boolean;
  clientId?: string;
  projects: Array<{
    id?: string;
    title?: string | null;
    event_type?: string | null;
    event_date?: string | null;
    status?: string | null;
    studio_id?: string | null;
  }>;
  albums: ClientAlbum[];
}> {
  return photoosRequest("client-albums", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getClientPayments(): Promise<{
  success: boolean;
  clientId?: string;
  payments: ClientPayment[];
}> {
  return photoosRequest("client-payments", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export type ClientFavoriteStudio = {
  favorite_id: string;
  vendor_id: string;
  studio_id: string;
  saved_at?: string | null;
  studio: {
    id: string;
    vendor_id: string;
    name: string;
    business_name?: string | null;
    display_name?: string | null;
    bio?: string | null;
    logo_path?: string | null;
    cover_path?: string | null;
    location?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    verification_status?: string | null;
  };
};

export async function getClientFavoriteStudios(): Promise<{
  success: boolean;
  data: ClientFavoriteStudio[];
  count: number;
}> {
  return photoosRequest("client-favorite-studios", {
    method: "POST",
    body: JSON.stringify({
      action: "list",
    }),
  }) as Promise<{
    success: boolean;
    data: ClientFavoriteStudio[];
    count: number;
  }>;
}

export async function saveClientFavoriteStudio(
  studioId: string,
): Promise<unknown> {
  return photoosRequest("client-favorite-studios", {
    method: "POST",
    body: JSON.stringify({
      action: "save",
      studio_id: studioId,
    }),
  });
}

export async function removeClientFavoriteStudio(
  favoriteId?: string,
  studioId?: string,
): Promise<unknown> {
  return photoosRequest("client-favorite-studios", {
    method: "POST",
    body: JSON.stringify({
      action: "remove",
      favorite_id: favoriteId ?? null,
      studio_id: studioId ?? null,
    }),
  });
}
