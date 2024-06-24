// fetch('https://icanhazdadjoke.com/j/R7UfaahVfFd')
// .then((data)=>{
//     return data.json()
// }).then((data)=>{
//     console.log(data)
// })


function fetchChuckNorrisJoke() {
    fetch(`https://icanhazdadjoke.com/j/R7UfaahVfFd`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response
      })
      .then(data => {
        console.log(data);
      })
      .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
      });
  }
  
  // Call the function initially
  fetchChuckNorrisJoke();
