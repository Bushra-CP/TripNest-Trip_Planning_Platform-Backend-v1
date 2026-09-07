// import { RoutePlanningService } from "./services/user(traveler)/trip-planning/ai-planning/route-planning.service";

// const testRoute = async (): Promise<void> => {
//   // Create an instance of our route planning service.
//   const routePlanningService =
//     new RoutePlanningService();

//   // This is the trip we want to test.
//   //
//   // The order is important:
//   //
//   // Palakkad → Vagamon → Munnar
//   const request = {
//     source: "Palakkad",
//     destinations: [
//       "Vagamon",
//       "Munnar",
//     ],
//     travelMode: "DRIVE" as const,
//   };

//   try {
//     // Ask our service to calculate the route.
//     const route =
//       await routePlanningService.calculateRoute(
//         request,
//       );

//     // Print the complete result.
//     console.log(
//       "Route result:",
//       JSON.stringify(
//         route,
//         null,
//         2,
//       ),
//     );
//   } catch (error) {
//     // Print any error that occurs.
//     console.error(
//       "Route calculation failed:",
//       error,
//     );
//   }
// };

// testRoute();
