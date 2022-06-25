const ratings = document.querySelectorAll('.rating');
if(ratings.length > 0){
    initRatings();
}
function  initRatings(){
    let ratingActive, ratingValue;
    for( let index = 0; index < ratings.length; index++){
        const rating = ratings[index];
        initRating(rating);
    }
    function initRating(rating){
        initRatingVars(rating)
        setRatingActiveWidth()

        if(rating.classList.contains('rating_set')){
            setRating(rating);
        }
    }
    function initRatingVars(rating){
        ratingActive = rating.querySelector('.rating__active')
        ratingValue = rating.querySelector('.rating__value')
    }

    function setRatingActiveWidth(index = ratingValue.value){
console.log(index)
        const ratingActiveWidth = index/0.05;
        console.log(ratingActiveWidth)
        ratingActive.style.width = `${ratingActiveWidth}%`

    }
    function setRating(rating){
        const ratingItems = document.querySelectorAll('.rating__item')
        for (let index = 0; index < ratingItems.length; index++){
            const ratingItem = ratingItems[index];
            ratingItem.addEventListener("mouseenter", function (e){
                initRatingVars(rating);
                setRatingActiveWidth(ratingItem.value)
            })
            ratingItem.addEventListener("mouseleave", function (e){
                setRatingActiveWidth();
            });
            ratingItem.addEventListener("click", function (e){
                initRatingVars(rating);


                    ratingValue.value = index + 1;
                    console.log(ratingValue.value)
                    setRatingActiveWidth();

            })

        }

    }
    // const buttonStar = document.querySelector('.button-star')
    // buttonStar.addEventListener("click", function (e){
    //     buttonStar.style.display = 'none'
    //     // }
    // })
}