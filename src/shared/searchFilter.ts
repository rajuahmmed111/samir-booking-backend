// export const searchFilter = (search: string) => {
//   if (!search) return {};

//   return {
//     OR: [
//       {
//         firstName: {
//           contains: search,
//           mode: "insensitive",
//         },
//       },
//       {
//         lastName: {
//           contains: search,
//           mode: "insensitive",
//         },
//       },
//       {
//         email: {
//           contains: search,
//           mode: "insensitive",
//         },
//       },
//       // {
//       //   orderId: {
//       //     contains: search,
//       //     mode: "insensitive",
//       //   },
//       // },
//     ],
//   };
// };

export const searchFilter = (search: string) => {
  if (!search) return {};

  return {
    OR: [
      {
        userName: {
          contains: search,
          mode: "insensitive",
        },

        email: {
          contains: search,
          mode: "insensitive",
        },
      },
    ],
  };
};
