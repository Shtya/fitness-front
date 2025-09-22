// const Program = {
//   name: 'Push Pull Leg',
//   asignTo: ['36eae674-a063-4287-b378-e3cab0364b91'],
//   coachId: '36eae674-a063-4287-b378-e3cab0364b91',
//   isActive: true,
//   program: {
//     days: [
//       {
//         id: 'saturday',
//         dayOfWeek: 'saturday',
//         name: 'Push Day 1 (Chest & Triceps)',
//         exercises: [ 
// 					{order : 1 , exercise : id},
// 					{order : 2 , exercise : id},
//         ],
//       },
//     ],

// 		meals : [] ,
// 		instructions : []
//   },

// };

const weeklyProgram = {
  id: '37965024-c22d-44d8-8eed-68857f971f52',
  created_at: '2025-09-07T09:50:35.088Z',
  updated_at: '2025-09-07T09:50:35.088Z',
  deleted_at: null,
  name: 'Push Pull Leg',
  userId: '36eae674-a063-4287-b378-e3cab0364b91',
  coachId: '36eae674-a063-4287-b378-e3cab0364b91',
  isActive: true,
  metadata: {},
  program: {
    days: [
      {
        id: 'saturday',
        dayOfWeek: 'saturday',
        name: 'Push Day 1 (Chest & Triceps)',
        exercises: [
          // Main lifts (your original, with the missing Machine Lateral Raises added as ex4b)
          { id: 'ex1', name: 'Machine Flat Chest Press', targetSets: 3, targetReps: '8', rest: 90, tempo: '1/1/1', img: '/uploads/20/container/img-1.png', video: '/uploads/20/container/vid-1.mp4', desc: 'Flat chest press on the machine.' },
          { id: 'ex2', name: 'Cable Crossover Press', targetSets: 3, targetReps: '15', rest: 75, tempo: '1/1/1', img: '/uploads/55/container/img-1.png', video: '/uploads/Cable Crossover Press/vid-1.mp4', desc: 'Cable machine crossover press.' },
          { id: 'ex3', name: 'Machine Incline Chest Press', targetSets: 3, targetReps: '12', rest: 90, tempo: '1/1/1', img: '/uploads/Machine Incline Chest Press/img-1.png', video: '/uploads/Machine Incline Chest Press/vid-1.mp4', desc: 'Incline chest press on the machine.' },
          { id: 'ex4', name: 'Lateral Raises', targetSets: 3, targetReps: '15', rest: 60, tempo: '1/1/1', img: '/uploads/Lateral Raises/img-1.png', video: '/uploads/Lateral Raises/vid-1.mp4', desc: 'Dumbbell lateral raises.' },
          { id: 'ex5', name: 'Tricep Pushdown Rope', targetSets: 3, targetReps: '15', rest: 60, tempo: '1/1/1', img: '/uploads/one hand tricep pushdown/img-1.png', video: '/uploads/one hand tricep pushdown/vid-1.mp4', desc: 'Tricep pushdown using rope attachment.' },
          { id: 'ex6', name: 'Tricep Extension V Bar', targetSets: 3, targetReps: '15', rest: 60, tempo: '1/1/1', img: '/uploads/Tricep Extension V Bar/img-1.png', video: '/uploads/Tricep Extension V Bar/vid-1.mp4', desc: 'Tricep extension with V bar.' },
        ],
      },
      {
        id: 'sunday',
        dayOfWeek: 'sunday',
        name: 'Pull Day 1 (Back & Biceps)',
        exercises: [
          // Main lifts
          { id: 'ex7', name: 'Machine Wide Grip Row', targetSets: 3, targetReps: '8', rest: 90, tempo: '1/1/1', img: '/uploads/118/container/img-1.png', video: '/uploads/118/container/vid-1.mp4', desc: 'Wide grip row on machine.' },
          { id: 'ex8', name: 'Seated Row Close Grip', targetSets: 3, targetReps: '12', rest: 90, tempo: '1/1/1', img: '/uploads/Seated Row Close Grip/img-1.png', video: '/uploads/Seated Row Close Grip/vid-1.mp4', desc: 'Seated row with close grip.' }, // media path differentiated
          { id: 'ex9', name: 'Lat Pulldown', targetSets: 3, targetReps: '15', rest: 90, tempo: '1/1/1', img: '/uploads/Lat Pulldown/img-1.png', video: '/uploads/Lat Pulldown/vid-1.mp4', desc: 'Lat pulldown on machine.' },
          { id: 'ex10', name: 'Reverse Fly Machine', targetSets: 3, targetReps: '15', rest: 90, tempo: '1/1/1', img: '/uploads/Reverse Fly Machine/img-1.png', video: '/uploads/Reverse Fly Machine/vid-1.mp4', desc: 'Reverse fly machine.' },

          { id: 'ex11', name: 'Cable Biceps Curl', targetSets: 3, targetReps: '15', rest: 60, tempo: '1/1/1', img: '/uploads/Cable Biceps Curl/img-1.png', video: '/uploads/Cable Biceps Curl/vid-1.mp4', video2: '/uploads/156/container/vid-2.mp4', desc: 'Cable biceps curls.' },
          { id: 'ex12', name: 'Wide Grip Barbell Shrugs', targetSets: 2, targetReps: '15', rest: 60, tempo: '1/1/1', img: '/uploads/Wide Grip Barbell Shrugs/img-1.png', video: '/uploads/Wide Grip Barbell Shrugs/vid-1.mp4', desc: 'Wide grip barbell shrugs.' },
          // Fixed media to match your uploads pattern
          { id: 'ex13', name: 'Back Extension', targetSets: 4, targetReps: '20', rest: 90, tempo: '1/1/1', img: '/uploads/Back Extension/img-1.png', video: '/uploads/Back Extension/vid-1.mp4', desc: 'Back extension on machine.' },
        ],
      },
      {
        id: 'monday',
        dayOfWeek: 'monday',
        name: 'Rest Day',
        exercises: [],
      },
      {
        id: 'tuesday',
        dayOfWeek: 'tuesday',
        name: 'Leg Day',
        exercises: [
          // Main lifts
          { id: 'ex14', name: 'Leg Extension', targetSets: 3, targetReps: '20', rest: 90, tempo: '1/1/1', img: '/uploads/116/container/img-1.png', video: '/uploads/116/container/vid-1.mp4', video2: '/uploads/116/container/vid-2.mp4', desc: 'Leg extension machine.' },
          { id: 'ex15', name: 'Leg Curl', targetSets: 3, targetReps: '20', rest: 90, tempo: '1/1/1', img: '/uploads/115/container/img-1.png', video: '/uploads/115/container/vid-1.mp4', video2: '/uploads/115/container/vid-2.mp4', desc: 'Leg curl machine.' },
          { id: 'ex16', name: 'Leg Press', targetSets: 3, targetReps: '15', rest: 90, tempo: '1/1/1', img: '/uploads/213/container/img-1.png', video: '/uploads/213/container/vid-1.mp4', video2: '/uploads/213/container/vid-2.mp4', desc: 'Leg press machine.' },
          { id: 'ex17', name: 'Standing Calf Raises', targetSets: 3, targetReps: '20', rest: 60, tempo: '1/1/1', img: '/uploads/119/container/img-1.png', video: '/uploads/119/container/vid-1.mp4', video2: '/uploads/119/container/vid-2.mp4', desc: 'Standing calf raises.' },
          { id: 'ex18', name: 'Seated Calf Raises', targetSets: 3, targetReps: '10', rest: 60, tempo: '1/1/1', img: '/uploads/218/container/img-1.png', video: '/uploads/218/container/vid-1.mp4', video2: '/uploads/218/container/vid-2.mp4', desc: 'Seated calf raises.' },
          { id: 'ex19', name: 'Cable Crunches', targetSets: 3, targetReps: '20', rest: 60, tempo: '1/1/1', img: '/uploads/162/container/img-1.png', video: '/uploads/162/container/vid-1.mp4', video2: '/uploads/162/container/vid-2.mp4', desc: 'Cable crunches.' },
        ],
      },
      {
        id: 'wednesday',
        dayOfWeek: 'wednesday',
        name: 'Push Day 2 (Chest, Shoulders & Triceps)',
        exercises: [
          // Main lifts
          { id: 'ex20', name: 'Smith Machine Flat Chest Press', targetSets: 3, targetReps: '10', rest: 90, tempo: '1/1/1', img: '/uploads/smith machine flat chest press/img-1.png', video: '/uploads/smith machine flat chest press/vid-1.mp4', desc: 'Smith machine flat chest press.' },
          { id: 'ex21', name: 'Dips Machine', targetSets: 3, targetReps: '10', rest: 90, tempo: '1/1/1', img: '/uploads/dips machine/img-1.png', video: '/uploads/dips machine/vid-1.mp4', video2: '/uploads/dips machine/vid-2.mp4', desc: 'Dips machine.' },
          { id: 'ex22', name: 'Smith Machine Incline Bench Press', targetSets: 3, targetReps: '10', rest: 90, tempo: '1/1/1', img: '/uploads/smith machine incline bench press/img-1.png', video: '/uploads/smith machine incline bench press/vid-1.mp4', desc: 'Smith machine incline bench press.' },
          // Fixed external media to uploads pattern
          { id: 'ex23', name: 'Rope Front Raises', targetSets: 3, targetReps: '15', rest: 60, tempo: '1/1/1', img: '/uploads/rope front raises/img-1.png', video: '/uploads/rope front raises/vid-1.mp4', desc: 'Rope front raises.' },
          { id: 'ex24', name: 'One Hand Cable Lateral Raises', targetSets: 3, targetReps: '15', rest: 60, tempo: '1/1/1', img: '/uploads/one hand cable lateral raises/img-1.png', video: '/uploads/one hand cable lateral raises/vid-1.mp4', desc: 'One hand cable lateral raises.' },
          { id: 'ex25', name: 'One Hand Tricep Pushdown', targetSets: 3, targetReps: '10', rest: 60, tempo: '1/1/1', img: '/uploads/one hand tricep pushdown/img-1.png', video: '/uploads/one hand tricep pushdown/vid-1.mp4', desc: 'One hand tricep pushdown.' },
          { id: 'ex26', name: 'Plank', targetSets: 3, targetReps: '1 minute', rest: 60, tempo: '1/1/1', img: '/uploads/plank/img-1.png', video: '/uploads/plank/vid-1.mp4', desc: 'Plank for core strengthening.' },
        ],
      },

      {
        id: 'thursday',
        dayOfWeek: 'thursday',
        name: 'Pull Day 2 (Back & Biceps)',
        exercises: [
          // Main lifts
          { id: 'ex27', name: 'Reverse Grip Seated Row', targetSets: 3, targetReps: '10', rest: 90, tempo: '1/1/1', img: '/uploads/reverse  grip seated row/img-1.png', video: '/uploads/reverse  grip seated row/vid-1.mp4', desc: 'Reverse grip seated row.' },
          { id: 'ex28', name: 'Lat Pulldown Close Grip', targetSets: 3, targetReps: '10', rest: 90, tempo: '1/1/1', img: '/uploads/221/container/img-1.png', video: '/uploads/lat pulldown close grip/vid-1.mp4', desc: 'Close grip lat pulldown.' },
          { id: 'ex29', name: 'One Arm Cable Row', targetSets: 3, targetReps: '10', rest: 90, tempo: '1/1/1', img: '/uploads/one arm cable row/img-1.png', video: '/uploads/one arm cable row/vid-1.mp4', desc: 'One arm cable row.' },
          { id: 'ex30', name: 'Face Pull', targetSets: 3, targetReps: '15', rest: 60, tempo: '1/1/1', img: '/uploads/161/container/img-1.png', video: '/uploads/face pull/vid-1.mp4', desc: 'Face pull using cable machine.' },
          // Fixed external media to uploads pattern
          { id: 'ex31', name: 'Bicep Spider Curl', targetSets: 3, targetReps: '15', rest: 60, tempo: '1/1/1', img: '/uploads/bicep spider curl/img-1.png', video: '/uploads/bicep spider curl/vid-1.mp4', desc: 'Spider curl for biceps.' },
          { id: 'ex32', name: 'Hammer Curl', targetSets: 3, targetReps: '15', rest: 60, tempo: '1/1/1', img: '/uploads/hammer curl/img-1.png', video: '/uploads/hammer curl/vid-1.mp4', desc: 'Hammer curl with dumbbells.' },
          { id: 'ex33', name: 'Russian Twist', targetSets: 3, targetReps: '25', rest: 60, tempo: '1/1/1', img: '/uploads/Russian twist/img-1.png', video: '/uploads/Russian twist/vid-1.mp4', desc: 'Russian twist for core.' },
        ],
      },
    ],
  },
};

export default weeklyProgram;
